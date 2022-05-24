const express = require('express')
const app = express()
const port =process.env.PORT || 5000;
const cors = require('cors')
const jwt = require('jsonwebtoken');
// requre dotenv
require('dotenv').config();
// mongo require
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// meddale ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crgm6.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



//jwt verify
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
  }

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("gelaxy_store").collection("user");
    const productcollection = client.db("gelaxy_store").collection("product");
    const ordercollection = client.db("gelaxy_store").collection("order");
    const commentscollection = client.db("gelaxy_store").collection("review");
    
      //send product all data
      app.get('/all',async(req,res)=>{
        const query = {}
        const cursol = productcollection.find(query).sort({_id:-1});
        const result =await cursol.toArray();
        res.send(result)

      })
      //product details single item
      app.get('/details/:id', async(req,res)=>{
        const id = req.params.id
        const query = {_id:ObjectId(id)}
        const item = await productcollection.findOne(query)
        res.send(item)
      })
      //add order to db
      app.post('/order', async (req, res) => {
        const booking = req.body;
        const result = await ordercollection.insertOne(booking);
        return res.send({ success: true, result });
      });
      //insert user
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result,token});
    });
   // user get order from dashboard
   app.get('/myorder', verifyJWT, async (req, res) => {
    const email = req.query.email;
    const decodedEmail = req.decoded.email;
    if (email === decodedEmail) {
      const query = { email: email };
      const bookings = await ordercollection.find(query).toArray();
      return res.send(bookings);
    }
    else {
      return res.status(403).send({ message: 'forbidden access' });
    }
  })
  // // user post orders
  app.post('/comment', async (req, res) => {
    const comment = req.body;
    const query = { review: comment.email}
    const exists = await commentscollection.findOne(query);
    if (exists) {
      return res.send({ success: false, comment: exists })
    }
    const result = await commentscollection.insertOne(comment);
    
    
    return res.send({ success: true, result });
  });
    
     // create admin
     app.put('/user/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      })



  }finally{

  }
  
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('gelaxy server is running')
})











app.listen(port, () => {
  console.log(`gelaxy server listening on port ${port}`)
})