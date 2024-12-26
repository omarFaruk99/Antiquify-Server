const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 3000;
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ReturnDocument,
} = require("mongodb");

// ***********************************************************************jwt
// Set up CORS to allow requests from the specified origin:
app.use(
  cors({
    origin: ["http://localhost:5173"], // Frontend URL

    // Allow sending cookies and authentication data with requests.
    // This is necessary for features like user authentication.
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ***********************************************************************verify jwt
// Middleware to verify JWT tokens from cookies for authentication.
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token; // Get token from cookies
  // console.log("token============>", token);

  // If no token is found in the cookies, send a 401 Unauthorized response
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  // Verifying the token using the secret key from environment variables
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // If verification fails (e.g., token is invalid or expired), send a 401 response
      return res.status(401).send({ message: "Unauthorized access" });
    }

    // If verification succeeds, attach decoded user data to request object
    req.user = decoded;
    next(); // Proceed to next middleware or route
  });
};

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

    // ********************************************************************jwt
    // JWT Authentication API -> Generate JSON Web Token
    app.post("/jwt", async (req, res) => {
      // Extract user data from the request body
      const user = req.body;

      // Sign a new JWT using the user data and a secret key from the environment variables
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr", // Set the token to expire in 1 hour
      });

      // Send the token as a secure cookie in the response
      res
        .cookie("token", token, {
          httpOnly: true, // Prevent client-side access to the cookie
          secure: false, // Set to true if using HTTPS
        })
        .send({ success: true }); // Send a success response
    });

    // **********************************************************************jwt logout
    // Logout Endpoint: Clear Authentication Token
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

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

    // #####################################################################start
    // Define a route to fetch detailed information about an artifact
    app.get("/artifacts/details/:id", async (req, res) => {
      // Extract the artifact ID from the URL parameters
      const id = req.params.id;
      console.log("--------", id);

      // Retrieve the user's email from the query parameters
      const userEmail = req.query.email;
      // console.log("reqQueryEmail===========>", userEmail);
      // console.log("verifytoken email========>", req.user.email);

      // **********************************************************
      // if (req.user.email !== req.query.email) {
      //   console.log("forbidddddddddddddddddd")
      //   return res.status(403).send({ message: "forbidden access" });
      // }

      // Create a query to find the artifact by its unique ID
      const query = { _id: new ObjectId(id) };

      try {
        // Find the artifact in the database
        const artifact = await artifactCollection.findOne(query);

        // If the artifact is not found, return a 404 error
        if (!artifact) {
          return res.status(404).send({ error: "Artifact not found" });
        }

        /*
      Check if the artifact has a field "likedBy" that stores a list of user emails who liked it.
      If the current user's email is in that list, set `isLikedByUser` to true, otherwise false.
    */
        const isLikedByUser = artifact.likedBy?.includes(userEmail) || false;

        // Respond with the artifact data and the `isLikedByUser` flag
        res.send({ ...artifact, isLikedByUser });
      } catch (error) {
        // Handle any unexpected errors (e.g., database connection issues)
        console.error("Error fetching artifact details:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // ==============================================:get Artifacts by login user: email
    app.get("/myArtifacts", verifyToken, async (req, res) => {
      const email = req.query.email; // Extract the query parameter 'email'
      const query = { addedByEmail: email }; // Build the query based on the email

      // ************************************
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      console.log("cuk cuk cookies====> ", req.cookies);

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

    // :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::Toggle Likes
    app.put("/artifacts/:id/like", async (req, res) => {
      // Extract artifact ID from URL parameters
      const { id } = req.params;

      // Extract action (like/dislike) and user's email from request body
      const { action, email } = req.body;

      // Validate the artifact ID to ensure it's a valid MongoDB ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid artifact ID" });
      }

      // Define the filter for finding the artifact by ID
      const filter = { _id: new ObjectId(id) };

      // Define the update operations based on the like/dislike action
      const update = {
        $inc: { likes: action === "like" ? 1 : -1 }, // Increment or decrement likes
        ...(action === "like"
          ? { $addToSet: { likedBy: email } } // Add email to likedBy array if liking
          : { $pull: { likedBy: email } }), // Remove email from likedBy array if disliking
      };

      // Perform the update operation
      const updateResult = await artifactCollection.updateOne(filter, update);

      // Check if the artifact was found and updated
      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: "Artifact not found" });
      }

      // Retrieve the updated artifact document
      const updatedDocument = await artifactCollection.findOne(filter);

      // Send the updated artifact document as a response
      res.json(updatedDocument);
    });
    // ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::End

    //==================================================get login user liked artifacts
    app.get("/artifacts/liked", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      const query = { likedBy: userEmail };

      // *******************************************
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const result = await artifactCollection.find(query).toArray();
      res.send(result);
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
