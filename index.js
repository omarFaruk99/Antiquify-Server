const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.siwod.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //access the collection: 'artifacts' within the database: 'AntiquifyDB'
    const artifactCollection = client.db("AntiquifyDB").collection("artifacts");

    // ==============================================:artifacts(get)
    // retrive all 'artifacts' from the database
    app.get("/artifacts", async (req, res) => {
      const cursor = artifactCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // ==============================================:artifacts(get) liked_top-6
    // retrive top==:6 'artifacts' from the database
    app.get("/artifacts/top", async (req, res) => {
      const options = {
        sort: { likes: -1 },
        limit: 6,
      };
      const cursor = artifactCollection.find({}, options); // The {} means "no filter"
      const result = await cursor.toArray();
      res.send(result);
    });

    // =============================================: /artifacts Details by id
    app.get("/artifacts/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; // find the document with the specific ObjectId
      const result = await artifactCollection.findOne(query);
      res.send(result);
    });

    // ==============================================:get Artifacts by login user: email
    app.get("/myArtifacts", async (req, res) => {
      const email = req.query.email; // Extract the query parameter 'email'
      const query = { addedByEmail: email }; // Build the query based on the email
      const result = await artifactCollection.find(query).toArray();
      res.send(result);
    });

    // ==============================================:artifacts(post)
    app.post("/artifacts", async (req, res) => {
      const artifact = req.body;
      console.log("artifact received from server=======>", artifact);
      const result = await artifactCollection.insertOne(artifact);
      res.send(result);
    });

    //================================================:delete artifacts by id
    app.delete("/artifacts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await artifactCollection.deleteOne(query);
      if (result.deletedCount === 1) {
        res.send({ success: true });
      } else {
        res.status(404).send({ error: "Artifact not found" });
      }
    });

    // :::::::::::::::::::::::::::::::::::::::::::::::::update Artifact
    app.put("/artifacts/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const artifactInfo = req.body;

      const updateInfos = {
        $set: {
          artifactName: artifactInfo.artifactName,
          artifactImage: artifactInfo.artifactImage,
          artifactType: artifactInfo.artifactType,
          historicalContext: artifactInfo.historicalContext,
          createdAt: artifactInfo.createdAt,
          discoveredAt: artifactInfo.discoveredAt,
          discoveredBy: artifactInfo.discoveredBy,
          presentLocation: artifactInfo.presentLocation,
        },
      };
      // console.log("get update info=======>", updateInfos);
      const result = await artifactCollection.updateOne(filter, updateInfos);
      if (result.modifiedCount > 0) {
        res.send({ success: true });
      } else {
        res.status(404).send({ error: "Artifact not found" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// ------------------------------------------------------------------------
// When a user visits this URL, the server responds with 'Hello World!'.
app.get("/", (req, res) => {
  res.send("Hello World! from <=====Antiquify Server=====>");
});

// When the server starts, log a message indicating that it's running.
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
