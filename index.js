const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

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
    app.get('/bids/:email', async(req, res) => {
      const email = req.params.email;
      const buyer = req.query.buyer;
      let query = {};
      if(buyer) {
        query.buyer = email
      }else{
        query.email = email
      }
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    })

    // bid request for specific user
      app.get('/bid-request/:email', async(req, res) => {
      const email = req.params.email;
      const query = {buyer:email};
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    })

    // update a bid status
    app.patch('/bid-status-update/:id', async(req, res) => {
      const id = req.params.id;
      const {status} = req.body;
      const filter = {_id: new ObjectId(id)};
      const updated = {
        $set:{status}
      }
      const result = await bidsCollection.updateOne(filter, updated);
      res.send(result);
    })

    // get all the posted job api
    app.get("/addJob", async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get login user posted job api
    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
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
