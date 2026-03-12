const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5jgflna.mongodb.net/?appName=Cluster0`;
console.log(uri);

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
    const myDb = client.db("solo");
    const jobCollection = myDb.collection("jobs");
    const bidsCollection = myDb.collection("bids");

    // Jwt Token Authentication
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, `${process.env.VITE_SECRETKEY}`, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Clear A token From Browser
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Verify Token Funtion
    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).send({ Message: "UnAuthorized Access" });
      }
      jwt.verify(token, `${process.env.VITE_SECRETKEY}`, (err, decode) => {
        if (err) {
          return res.status(401).send("unAuthorized token");
        }
        req.user = decode;
        next();
      });
    };

    // post jobs api
    app.post("/addJob", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // post bids api
    app.post("/addBid", async (req, res) => {
      const bidData = req.body;

      // intending to apply for the same job twice
      const query = { email: bidData?.email, jobId: bidData?.jobId };
      const alreadyExist = await bidsCollection.findOne(query);
      if (alreadyExist) {
        return res
          .status(400)
          .send("You have all ready placed a bid on this job");
      }

      const result = await bidsCollection.insertOne(bidData);

      // increase bid count in bid collection
      const filter = { _id: new ObjectId(bidData.jobId) };
      const updateDoc = {
        $inc: { bid_count: 1 },
      };
      const updateBidCount = await jobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get All bids for specific user
    app.get("/bids/:email", verifyToken, async (req, res) => {
      const decodeEmail = req.user.email;
      const email = req.params.email;
      if (decodeEmail !== email) {
        return res.status(403).send({
          message: "Forbidden Access!",
        });
      }

      const buyer = req.query.buyer;
      let query = {};
      if (buyer) {
        query.buyer = email;
      } else {
        query.email = email;
      }
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // bid request for specific user
    app.get("/bid-request/:email", verifyToken, async (req, res) => {
      const decodeEmail = req.user.email;
      console.log(decodeEmail);
      const email = req.params.email;
      const query = { buyer: email };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // update a bid status
    app.patch("/bid-status-update/:id", async (req, res) => {
      const id = req.params.id;
      const { status, jobId } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updated = {
        $set: { status },
      };
      const result = await bidsCollection.updateOne(filter, updated);

      // change job status
      if (status === "In Progress" && jobId) {
        const filterJob = { _id: new ObjectId(jobId) };
        const jobUpdated = {
          $set: { status: "Closed" },
        };
        await jobCollection.updateOne(filterJob, jobUpdated);
      }

      res.send(result);
    });

    // get all the posted job api
    app.get("/addJob", async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get All Job api
    app.get("/get-allJobs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 10;
      let options = {};
      if (sort)
        options = {
          sort: { deadline: sort === "asc" ? 1 : -1 },
        };
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      if (filter) query.category = filter;
      const cursor = jobCollection.find(query, options);
      const result = await jobCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // get login user posted job api
    app.get("/jobs/:email", verifyToken, async (req, res) => {
      const decodeEmail = req.params.email;
      const email = req.params.email;
      if (decodeEmail !== email) {
        return res.status(403).send({
          message: "Forbidden Access!",
        });
      }
      const query = { "buyer.email": email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    // get a specific data from database api
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // Update Specific data api
    app.put("/updateJob/:id", async (req, res) => {
      const id = req.params.id;
      const job = req.body;
      const updateDoc = {
        $set: job,
      };
      const options = { upsert: true };
      const filter = { _id: new ObjectId(id) };
      const result = await jobCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // How many jobs are in the JobsApplication API
    app.get("/jobs-count", async (req, res) => {
      const count = await jobCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // Delet A posted Job api
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
