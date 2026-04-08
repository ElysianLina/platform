"""
peoples_speech_cefr_filter.py
══════════════════════════════════════════════════════════════════════
Pipeline optimisé pour plateforme d'apprentissage (activité listening) :
  1. Charger le dataset SANS audio (texte + métadonnées seulement)
  2. Détecter le niveau CEFR de chaque transcription
  3. Filtrer par niveau
  4. Télécharger les audios UNIQUEMENT des exemples filtrés
  5. Sauvegarder JSON + CSV + audios

Avantage : on ne télécharge pas des centaines de Go pour rien.
  microset (~336 ex)  → quelques Mo
  clean   (~1.55M ex) → des centaines de Go si tout téléchargé

Pré-requis :
    pip install datasets soundfile

Lancer depuis le dossier backend/ :
    python scripts/peoples_speech_cefr_filter.py
══════════════════════════════════════════════════════════════════════
"""

import json
import re
import sys
import os
from pathlib import Path
from collections import Counter

# ══════════════════════════════════════════════════════════════════
#  CONFIGURATION — MODIFIE CES VALEURS
# ══════════════════════════════════════════════════════════════════

VOCAB_DIR     = "data"                                 # dossier contenant word_vocabulary_XX.json
TARGET_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]  # tous les niveaux
SUBSET        = "microset"                             # "microset" | "clean" | "dirty"
SPLIT         = "train"                                # "train" | "validation" | "test"
OUTPUT_DIR    = "output_filtered"                      # dossier de sortie
SAVE_AUDIO    = True                                   # ← True : télécharge les audios filtrés
AUDIO_FORMAT  = "wav"                                  # "wav" | "mp3"

# Subsets disponibles sur HuggingFace :
#   "microset"   → 336 lignes     ← TESTER ICI
#   "clean"      → 1.55M lignes   ← version propre
#   "dirty"      → 5.53M lignes   ← version bruitée
#   "clean_sa"   → 311k lignes
#   "dirty_sa"   → 602k lignes

# ══════════════════════════════════════════════════════════════════


# ── Import de cefr_detector_v2.py ────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from cefr_detector_v2 import CefrDetector
    print("✅ cefr_detector_v2.py importé avec succès")
except ImportError as e:
    print(f"❌ Impossible d'importer cefr_detector_v2.py : {e}")
    print("   → Vérifie que cefr_detector_v2.py est bien dans le même dossier scripts/")
    sys.exit(1)


# ══════════════════════════════════════════════════════════════════
#  PRE-PROCESSING DU TEXTE
# ══════════════════════════════════════════════════════════════════

def preprocess_text(text: str) -> str:
    """
    Nettoie le texte brut de People's Speech avant détection CEFR.
    - Normalise les apostrophes typographiques → ASCII
    - Supprime l'apostrophe dans les contractions (don't→dont, I'm→im)
      pour que le LEMMA_MAP de cefr_detector_v2 les reconnaisse
    - Nettoie les espaces multiples
    """
    if not text:
        return text
    text = text.replace('\u2019', "'").replace('\u2018', "'")
    text = text.replace('\u02bc', "'").replace('\u0060', "'")
    text = re.sub(r"(\w)'(\w)", r"\1\2", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ══════════════════════════════════════════════════════════════════
#  ÉTAPE 1 — Charger le dataset SANS audio (léger)
# ══════════════════════════════════════════════════════════════════

def load_text_only(subset: str, split: str):
    """
    Charge uniquement les colonnes texte/métadonnées, pas l'audio.
    Évite de télécharger des Go de fichiers audio inutiles.
    """
    try:
        from datasets import load_dataset
    except ImportError:
        print("❌ Module 'datasets' manquant. Lance : pip install datasets")
        sys.exit(1)

    print(f"\n📥 Chargement People's Speech (texte seulement)")
    print(f"   subset='{subset}', split='{split}'")
    print("   (La première fois peut prendre quelques minutes...)\n")

    ds = load_dataset(
        "MLCommons/peoples_speech",
        subset,
        split=split,
    )

    # Supprimer la colonne audio immédiatement → gain mémoire important
    if "audio" in ds.column_names:
        ds = ds.remove_columns(["audio"])
        print("   ℹ️  Colonne audio retirée (rechargée uniquement pour les exemples filtrés)")

    print(f"✅ Dataset chargé : {len(ds):,} exemples")
    print(f"   Colonnes conservées : {ds.column_names}")
    return ds


# ══════════════════════════════════════════════════════════════════
#  ÉTAPE 2 — Détecter CEFR + filtrer
# ══════════════════════════════════════════════════════════════════

def detect_and_filter(ds, detector: CefrDetector, target_levels: list):
    """
    Applique le pre-processing et le détecteur CEFR sur chaque transcription,
    puis filtre selon les niveaux souhaités.
    Retourne le dataset annoté + filtré (sans audio).
    """
    print(f"\n🔍 Détection CEFR sur {len(ds):,} exemples...")
    print(f"   Niveaux recherchés : {target_levels}\n")

    def annotate(example):
        text = preprocess_text(example["text"])
        niveau = detector.detect(text)
        return {"cefr": niveau}

    ds_annotated = ds.map(
        annotate,
        batched=False,
        desc="Détection CEFR",
    )

    # Distribution
    dist  = Counter(ds_annotated["cefr"])
    total = len(ds_annotated)

    print("\n📊 Distribution CEFR détectée :")
    for lvl in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        n   = dist.get(lvl, 0)
        pct = n / total * 100 if total else 0
        bar = "█" * int(pct / 2)
        print(f"   {lvl}  {pct:5.1f}%  {bar}  ({n:,})")

    # Filtrage
    ds_filtered = ds_annotated.filter(
        lambda x: x["cefr"] in target_levels,
        desc=f"Filtrage {target_levels}",
    )

    kept_pct = len(ds_filtered) / total * 100 if total else 0
    print(f"\n✅ Après filtrage : {len(ds_filtered):,} exemples gardés ({kept_pct:.1f}%)")
    return ds_filtered


# ══════════════════════════════════════════════════════════════════
#  ÉTAPE 3 — Télécharger les audios des exemples filtrés SEULEMENT
# ══════════════════════════════════════════════════════════════════
from datasets.features import Audio
import soundfile as sf
import numpy as np
import io
def download_filtered_audios(ds_filtered, subset: str, split: str,
                              output_dir: str, audio_format: str = "wav"):
    """
    Recharge le dataset complet en mode STREAMING avec audio,
    mais ne garde que les exemples dont l'ID est dans ds_filtered.

    Stratégie :
      - Set des IDs filtrés pour lookup O(1)
      - Itération streaming → un seul exemple en mémoire à la fois
      - Audio sauvegardé dans output_dir/audio/<cefr>/<id>.<format>
      - Arrêt dès que tous les exemples filtrés sont récupérés
    """
    try:
        from datasets import load_dataset
        import soundfile as sf
    except ImportError as e:
        print(f"❌ Module manquant : {e}")
        print("   Lance : pip install datasets soundfile")
        sys.exit(1)

    # Index : id → cefr
    filtered_index = {ex["id"]: ex["cefr"] for ex in ds_filtered}
    total_needed   = len(filtered_index)

    print(f"\n🔊 Téléchargement audio pour {total_needed:,} exemples filtrés...")
    print(f"   Format de sortie : .{audio_format}")

    # Créer un sous-dossier par niveau CEFR
    audio_dir = Path(output_dir) / "audio"
    for lvl in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        (audio_dir / lvl).mkdir(parents=True, exist_ok=True)

    # Recharger en streaming (ne télécharge que les exemples itérés)
    print("   Rechargement en mode streaming (avec audio)...")
    ds_stream = load_dataset(
    "MLCommons/peoples_speech",
    subset,
    split=split,
    streaming=True,
).cast_column("audio", Audio(decode=False))

    downloaded = 0

    for example in ds_stream:
        ex_id = example.get("id", "")

        # Ignorer si pas dans les exemples filtrés
        if ex_id not in filtered_index:
            continue

        cefr  = filtered_index[ex_id]
        audio = example.get("audio", {})

        if not audio:
            print(f"   ⚠️  Audio manquant pour id={ex_id}")
            continue

        audio_bytes = audio.get("bytes")
        sample_rate = 16000
        array, sample_rate = sf.read(io.BytesIO(audio_bytes))

        if array is None or len(array) == 0:
            print(f"   ⚠️  Array audio vide pour id={ex_id}")
            continue

        # Nom de fichier : sanitize l'ID
        safe_id  = re.sub(r'[^\w\-]', '_', str(ex_id))
        out_path = audio_dir / cefr / f"{safe_id}.{audio_format}"

        sf.write(str(out_path), array, sample_rate)
        downloaded += 1

        if downloaded % 50 == 0 or downloaded == total_needed:
            print(f"   ✅ {downloaded}/{total_needed} audios téléchargés...")

        # Arrêter dès qu'on a tout → pas besoin de parcourir tout le dataset
        if downloaded >= total_needed:
            break

    print(f"\n✅ {downloaded:,} audios sauvegardés dans : {audio_dir}/")
    if downloaded < total_needed:
        missing = total_needed - downloaded
        print(f"   ⚠️  {missing} audio(s) non récupérés (données manquantes dans le dataset)")

    return audio_dir


# ══════════════════════════════════════════════════════════════════
#  ÉTAPE 4 — Sauvegarder métadonnées (JSON + CSV)
# ══════════════════════════════════════════════════════════════════

def save_results(ds_filtered, output_dir: str, target_levels: list, audio_dir=None):
    """Sauvegarde le dataset filtré en JSON et CSV avec chemin audio si dispo."""
    import csv

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    levels_str = "_".join(target_levels)
    records    = []

    for ex in ds_filtered:
        ex_id   = ex.get("id", "")
        cefr    = ex.get("cefr", "")
        safe_id = re.sub(r'[^\w\-]', '_', str(ex_id))

        record = {
            "id":          ex_id,
            "duration_ms": ex.get("duration_ms", 0),
            "text":        ex.get("text", ""),
            "cefr":        cefr,
        }

        # Chemin relatif vers l'audio (pour ta plateforme Django)
        if audio_dir:
            audio_path = Path(audio_dir) / cefr / f"{safe_id}.{AUDIO_FORMAT}"
            record["audio_path"] = str(audio_path) if audio_path.exists() else ""

        records.append(record)

    # JSON
    json_path = out / f"peoples_speech_{levels_str}.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"\n💾 JSON : {json_path}  ({len(records):,} entrées)")

    # CSV
    csv_path   = out / f"peoples_speech_{levels_str}.csv"
    fieldnames = list(records[0].keys()) if records else ["id", "duration_ms", "text", "cefr"]
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"💾 CSV  : {csv_path}")

    # Résumé
    summary_path = out / f"summary_{levels_str}.txt"
    dist = Counter(r["cefr"] for r in records)
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(f"Dataset   : MLCommons/peoples_speech\n")
        f.write(f"Subset    : {SUBSET}\n")
        f.write(f"Niveaux   : {target_levels}\n")
        f.write(f"Total     : {len(records):,} exemples\n\n")
        f.write("Distribution :\n")
        for lvl, n in sorted(dist.items()):
            f.write(f"  {lvl} : {n:,}\n")
        if audio_dir:
            f.write(f"\nAudios    : {audio_dir}/\n")
    print(f"💾 Résumé : {summary_path}")

    return json_path, csv_path


def show_examples(ds_filtered, n: int = 5):
    """Affiche quelques exemples filtrés."""
    print(f"\n─── Exemples filtrés (premiers {n}) ───────────────────────")
    for i, ex in enumerate(ds_filtered.select(range(min(n, len(ds_filtered))))):
        cefr = ex.get("cefr", "?")
        text = ex.get("text", "")[:120]
        dur  = ex.get("duration_ms", 0) / 1000
        print(f"\n  [{i+1}] Niveau : {cefr}  |  Durée : {dur:.1f}s")
        print(f"       \"{text}...\"")
    print()


# ══════════════════════════════════════════════════════════════════
#  POINT D'ENTRÉE
# ══════════════════════════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║     People's Speech  ×  CEFR Detector v2            ║")
    print("║     Pipeline : Filtrer d'abord → Audio ensuite      ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"\n  Subset      : {SUBSET}")
    print(f"  Niveaux     : {TARGET_LEVELS}")
    print(f"  Save audio  : {SAVE_AUDIO}")
    print(f"  Sortie      : {OUTPUT_DIR}/\n")

    # 1. Charger le détecteur CEFR
    detector = CefrDetector(vocab_dir=VOCAB_DIR)

    # 2. Charger le dataset SANS audio (rapide et léger)
    ds = load_text_only(subset=SUBSET, split=SPLIT)

    # 3. Détecter CEFR et filtrer
    ds_filtered = detect_and_filter(ds, detector, target_levels=TARGET_LEVELS)

    if len(ds_filtered) == 0:
        print("⚠️  Aucun exemple trouvé pour ces niveaux.")
        return

    # 4. Afficher quelques exemples
    show_examples(ds_filtered, n=5)

    # 5. Télécharger les audios UNIQUEMENT des exemples filtrés
    audio_dir = None
    if SAVE_AUDIO:
        audio_dir = download_filtered_audios(
            ds_filtered,
            subset=SUBSET,
            split=SPLIT,
            output_dir=OUTPUT_DIR,
            audio_format=AUDIO_FORMAT,
        )

    # 6. Sauvegarder les métadonnées
    save_results(
        ds_filtered,
        output_dir=OUTPUT_DIR,
        target_levels=TARGET_LEVELS,
        audio_dir=audio_dir,
    )

    print("\n✅ Terminé !")
    print(f"   📁 Résultats dans : {Path(OUTPUT_DIR).absolute()}/")
    if SAVE_AUDIO:
        print(f"   🔊 Audios dans    : {Path(OUTPUT_DIR).absolute()}/audio/<niveau>/\n")


if __name__ == "__main__":
    main()