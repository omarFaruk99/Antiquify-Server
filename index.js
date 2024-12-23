const express = require("express");
const cors = require("cors");

const app = express();

const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// When a user visits this URL, the server responds with 'Hello World!'.
app.get("/", (req, res) => {
  res.send("Hello World! from <=====Antiquify Server=====>");
});

// When the server starts, log a message indicating that it's running.
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
