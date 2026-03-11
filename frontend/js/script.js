fetch("http://127.0.0.1:8000/api/test/")
  .then(response => response.json())
  .then(data => {
      console.log(data);
  });
  