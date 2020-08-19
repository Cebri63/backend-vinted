// Import du package 'express'
const express = require("express");
// Appel à la fonction Router(), issue du package 'express'
const router = express.Router();

// Import du package cloudinary
const cloudinary = require("cloudinary").v2;

// Connexion à l'espace de stockage cloudinary
cloudinary.config({
  cloud_name: "brice",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Import du model User et Offer
// afin d'éviter des erreurs (notamment dues à d'eventuelles références entre les collections)
// nous vous conseillons d'importer touts vos models dans toutes vos routes
const User = require("../models/User");
const Offer = require("../models/Offer");

// Import du middleware isAuthenticated
const isAuthenticated = require("../middleware/isAuthenticated");

// Route qui nous permettra de récupérer une liste d'annonces, en fonction de filtres
// Si aucun filtre n'est envoyé, cette route renverra l'ensemble des annonces
router.get("/offers", async (req, res) => {
  try {
    // création d'un objet dans lequel on va sotcker nos différents filtres
    const filters = {};

    // passage dans différentes conditions pour savoir quel(s) filtre(s) a soumis l'utilisateur
    if (req.query.title) {
      filters.title = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin) {
      filters.price = {
        $gte: req.query.priceMin,
      };
    }
    if (req.query.priceMax) {
      if (filters.price) {
        filters.price.$lte = req.query.priceMax;
      } else {
        filters.price = {
          $lte: req.query.priceMax,
        };
      }
    }

    // création d'un objet dans lequel on va stocker le classement des annonces, choisi par l'utilisateur
    let sort = {};

    if (req.query.sort === "date-asc") {
      sort = { created: "asc" };
    } else if (req.query.sort === "date-desc") {
      sort = { created: "desc" };
    } else if (req.query.sort === "price-asc") {
      sort = { price: "asc" };
    } else if (req.query.sort === "price-desc") {
      sort = { price: "desc" };
    }

    // les query sont par défaut des chaînes de caractères
    // les méthodes sort(), skip() et limi() n'acceptent que des nombres
    let page = Number(req.query.page);
    let limit = Number(req.query.limit);

    // Rechercher dans la BDD les annonces qui match avec les query envoyées
    // Notez que l'on peut chaîner les méthodes
    const offers = await Offer.find(filters)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "creator",
        select: "account.username account.phone",
      });

    // cette ligne va nous retourner le nombre d'annonces trouvées en fonction des filtres
    const count = await Offer.countDocuments(filters);

    res.json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  // route qui permmet de récupérer les informations d'une offre en fonction de son id
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "creator",
      select: "account.username account.phone",
    });
    res.json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  // route qui permet de poster une nouvelle annonce
  try {
    // Envoi de l'image à cloudinary
    const result = await cloudinary.uploader.upload(req.files.picture.path);

    // Création de la nouvelle annonce
    const newOffer = new Offer({
      title: req.fields.title,
      description: req.fields.description,
      price: req.fields.price,
      picture: result,
      brand: req.fields.brand,
      category: req.fields.category,
      condition: req.fields.condition,
      creator: req.user,
      created: new Date(),
    });

    await newOffer.save();
    res.json({
      _id: newOffer._id,
      title: newOffer.title,
      description: newOffer.description,
      price: newOffer.price,
      brand: newOffer.brand,
      category: newOffer.category,
      condition: newOffer.condition,
      created: newOffer.created,
      creator: {
        account: newOffer.creator.account,
        _id: newOffer.creator._id,
      },
      picture: newOffer.picture,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// RESET ET INITIALISATION BDD

router.get("/reset-api", async (req, res) => {
  // Vider la collection Offer
  // await Offer.collection.drop();
  // Puppeteer infinite scroll
  // Créer des nouvelles offres
  // insertMany
  res.json("WIP");
});

module.exports = router;
