const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());



//const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fd2onld.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fd2onld.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
       //await client.connect();

        const userCollection = client.db("finalDB").collection("users");
        const testCollection = client.db("finalDB").collection("tests");
        const districtCollection = client.db("finalDB").collection("districts");
        const upazilaCollection = client.db("finalDB").collection("upazila");
        const bannerCollection = client.db("finalDB").collection("banners");
        const recommendationCollection = client.db("finalDB").collection("recommendations");
        const reservationCollection = client.db("finalDB").collection("reservations");



        //jwt related
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            //token generate
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
            res.send({ token })
        })

        //middleware to verify token
        const verifyToken = (req, res, next) => {
            //console.log('get token form verifyToken', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized Access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized Access' })
                }
                //console.log("token verified")
                req.decoded = decoded;
                next();
            })
        }

        // verify user as admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }


        //checking whether admin or not
        app.get('/users/admin/:email',  async (req, res) => {
            const email = req.params.email;
            console.log("admin checking from server")
            // if (email !== req.decoded.email) {
            //     return res.status(403).send({ message: 'Forbidden Access' })
            // }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            console.log(admin);
            res.send({ admin })
        })



        app.get('/districts', async (req, res) => {
            const result = await districtCollection.find().toArray();
            res.send(result)
        })
        app.get('/upazila', async (req, res) => {
            const result = await upazilaCollection.find().toArray();
            res.send(result)
        })

        app.get('/users', async (req, res) => {

            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);

        })
        app.patch('/users/status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const user = await userCollection.find(filter).toArray();
            console.log(user[0].status)
            const updatedDoc = {
                $set: {
                    status: !user[0].status
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);

        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            // checking user whether exists in db or not
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exist", insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const options = { upsert: true };
            const user = req.body;
            const updatedUser = {
                $set: {
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    district: user.district,
                    upazila: user.upazila,
                    blood: user.blood,
                    status: user.status

                }
            }
            const result = await userCollection.updateOne(filter, updatedUser, options);
            res.send(result);
        })


        //test related api 
        app.post('/tests', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await testCollection.insertOne(item);
            res.send(result);
        })

        app.get('/tests', async (req, res) => {
            const result = await testCollection.find().toArray();
            res.send(result)
        })
        app.patch('/tests/slot/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const test = await testCollection.find(filter).toArray();
            const updatedDoc = {
                $set: {
                    slot: test[0].slot - 1
                }
            }
            const result = await testCollection.updateOne(filter, updatedDoc);
            res.send(result);

        })

        app.get('/tests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await testCollection.findOne(query)
            res.send(result)
        })

        app.put('/tests/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const test = req.body;
            const updatedTest = {
                $set: {
                    name: test.name,
                    price: parseFloat(test.price),
                    date: test.date,
                    slot: test.slot,
                    detail: test.detail,
                    image: test.image

                }
            }
            const result = await testCollection.updateOne(filter, updatedTest, options);
            res.send(result);
        })

        app.delete('/tests/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await testCollection.deleteOne(query);
            res.send(result);
        })


        //Banner related
        app.post('/banners', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await bannerCollection.insertOne(item);
            res.send(result);
        })
        app.get('/banners', async (req, res) => {
            const result = await bannerCollection.find().toArray();
            res.send(result)
        })

        app.patch('/banners/status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const banner = await bannerCollection.find(filter).toArray();
            console.log(banner[0].isActive)
            const updatedDoc = {
                $set: {
                    isActive: !banner[0].isActive
                }
            }
            const result = await bannerCollection.updateOne(filter, updatedDoc);
            res.send(result);

        })

        //Reservation
        app.post('/reservations', async (req, res) => {
            const item = req.body;
            const result = await reservationCollection.insertOne(item);
            res.send(result);
        })
        app.get('/reservations', async (req, res) => {
            const result = await reservationCollection.find().toArray()
            res.send(result)
        })
        app.patch('/reservations/status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: "delivered"
                }
            }
            const result = await reservationCollection.updateOne(filter, updatedDoc);
            res.send(result);

        })
       
        app.delete('/reservations/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await reservationCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/reservations/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await reservationCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/reservations/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await reservationCollection.deleteOne(query);
            res.send(result);
        })

        //recommendation related
        app.get('/recommendations', async (req, res) => {
            const result = await recommendationCollection.find().toArray();
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server running');
})

app.listen(port, () => {
    console.log(`server running on port ${port}`);
})