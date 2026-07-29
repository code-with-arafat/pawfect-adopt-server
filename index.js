const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = process.env.DATABASE_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Database & Collections
    const db = client.db("pawfectAdoptDB");
    const petsCollection = db.collection("pets");
    const requestsCollection = db.collection("adoptionRequests");

    // =========================================================
    // 1. PETS API ENDPOINTS
    // =========================================================

    // Get All Pets (with optional search/category filter)
    app.get("/pets", async (req, res) => {
      try {
        const { category, search } = req.query;
        let query = {};

        if (category && category !== "All") {
          query.category = category;
        }

        if (search) {
          query.name = { $regex: search, $options: "i" };
        }

        const pets = await petsCollection.find(query).toArray();
        res.send(pets);
      } catch (error) {
        console.error("Error in GET /pets:", error);
        res.status(500).send({ message: "Failed to fetch pets", error: error.message });
      }
    });

    // Get Single Pet Details
    app.get("/pets/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const pet = await petsCollection.findOne(query);
        if (!pet) return res.status(404).send({ message: "Pet not found" });
        res.send(pet);
      } catch (error) {
        console.error("Error in GET /pets/:id:", error);
        res.status(400).send({ message: "Invalid Pet ID format" });
      }
    });

    // Add New Pet
    app.post("/pets", async (req, res) => {
      try {
        const newPet = req.body;
        newPet.createdAt = new Date();
        const result = await petsCollection.insertOne(newPet);
        res.send(result);
      } catch (error) {
        console.error("Error in POST /pets:", error);
        res.status(500).send({ message: "Failed to add pet", error: error.message });
      }
    });

    // Get Pets Added By Specific User (My Listings)
    app.get("/my-pets", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ message: "Email is required" });

        const query = { addedByEmail: email };
        const myPets = await petsCollection.find(query).toArray();
        res.send(myPets);
      } catch (error) {
        console.error("Error in GET /my-pets:", error);
        res.status(500).send({ message: "Failed to fetch user pets" });
      }
    });

    // =========================================================
    // 2. ADOPTION REQUESTS API ENDPOINTS
    // =========================================================

    // Submit Adoption Request
    app.post("/adoption-requests", async (req, res) => {
      try {
        const requestData = req.body;
        requestData.status = "Pending";
        requestData.createdAt = new Date();

        const result = await requestsCollection.insertOne(requestData);
        res.send(result);
      } catch (error) {
        console.error("Error in POST /adoption-requests:", error);
        res.status(500).send({ message: "Failed to submit request" });
      }
    });

    // Get Adoption Requests Submitted BY Logged-in User (Adopter View)
    app.get("/my-requests", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ message: "Email is required" });

        const query = { applicantEmail: email };
        const requests = await requestsCollection.find(query).toArray();
        res.send(requests);
      } catch (error) {
        console.error("Error in GET /my-requests:", error);
        res.status(500).send({ message: "Failed to fetch requests" });
      }
    });

    // NEW: Get Adoption Requests Received FOR User's Pets (Pet Owner View)
    app.get("/owner-requests", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ message: "Owner email is required" });

        // Matches requests where pet's owner email is logged-in email
        const query = { ownerEmail: email };
        const requests = await requestsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.send(requests);
      } catch (error) {
        console.error("Error in GET /owner-requests:", error);
        res.status(500).send({ message: "Failed to fetch owner adoption requests" });
      }
    });

    // NEW: Update Adoption Request Status (Approve / Reject)
    app.patch("/adoption-requests/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).send({ message: "Status field is required" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: status,
            updatedAt: new Date(),
          },
        };

        const result = await requestsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error in PATCH /adoption-requests/:id:", error);
        res.status(500).send({ message: "Failed to update request status" });
      }
    });

    // Cancel / Delete Adoption Request
    app.delete("/adoption-requests/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await requestsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error in DELETE /adoption-requests:", error);
        res.status(500).send({ message: "Failed to cancel request" });
      }
    });

    console.log("Pinged your deployment. Successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("PawfectAdopt Server is running...");
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});