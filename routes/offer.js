// Import du package 'express'
const express = require("express");
// Appel à la fonction Router(), issue du package 'express'
const router = express.Router();

// Import du package cloudinary
const cloudinary = require("cloudinary").v2;

// Import du model User et Offer
// afin d'éviter des erreurs (notamment dues à d'eventuelles références entre les collections)
// nous vous conseillons d'importer tous vos models dans toutes vos routes
const User = require("../models/User");
const Offer = require("../models/Offer");

// Import du middleware isAuthenticated
const isAuthenticated = require("../middleware/isAuthenticated");

// Import des datas (ne pas en tenir compte, cela sert au reset de la BDD entre 2 sessions de formation)
const products = require("../data/products.json");
const goScrapp = require("../middleware/scrapping");

// Route qui nous permet de récupérer une liste d'annonces, en fonction de filtres
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
        path: "owner",
        select: "account.username account.phone account.avatar",
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

// Route qui permmet de récupérer les informations d'une offre en fonction de son id
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone account.avatar",
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
    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      folder: "vinted",
    });

    // Création de la nouvelle annonce
    const newOffer = new Offer({
      product_name: req.fields.title,
      product_description: req.fields.description,
      product_price: req.fields.price,
      product_details: [
        { MARQUE: req.fields.brand },
        { TAILLE: req.fields.size },
        { ÉTAT: req.fields.condition },
        { COULEUR: req.fields.color },
        { EMPLACEMENT: req.fields.city },
      ],
      product_image: result,
      creator: req.user,
    });

    await newOffer.save();
    res.json({
      _id: newOffer._id,
      product_name: newOffer.product_name,
      product_description: newOffer.product_description,
      product_price: newOffer.product_price,
      product_details: newOffer.product_details,
      creator: {
        account: newOffer.creator.account,
        _id: newOffer.creator._id,
      },
      product_image: newOffer.product_image,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// RESET ET INITIALISATION BDD

router.get("/reset-offers", goScrapp, async (req, res) => {
  // Lancer le scrapping
  // Le scrapping est lancé via le middleware goScrapp
  // Si le scrapping est OK, nous passons à la suite du code :

  // On vérifie qu'il y a bien des users dans la BDD
  const allUserId = await User.find().select("_id");
  // console.log(allUserId);
  if (allUserId.length === 0) {
    return res.send(
      "Il faut d'abord reset la BDD de users. Voir la route /reset-users"
    );
  } else {
    // Vider la collection Offer
    await Offer.deleteMany({});

    // Supprimer le dossier "api/vinted/offers" sur cloudinary

    // Pour cela, il faut supprimer les images, cloudinary ne permettant pas de supprimer des dossiers qui ne sont pas vides
    try {
      const deleteResources = await cloudinary.api.delete_resources_by_prefix(
        "api/vinted/offers"
      );
    } catch (error) {
      console.log("deleteResources ===>  ", error.message);
    }

    // Maintenant les dossiers vides, on peut les supprimer
    try {
      const deleteFolder = await cloudinary.api.delete_folder(
        "api/vinted/offers"
      );
    } catch (error) {
      console.log("deleteFolder error ===> ", error.message);
    }

    // // Créer les annonces
    for (let i = 0; i < products.length; i++) {
      try {
        // Création de la nouvelle annonce
        const newOffer = new Offer({
          product_name: products[i].product_name,
          product_description: products[i].product_description,
          product_price: products[i].product_price,
          product_details: products[i].product_details,
          // créer des ref aléatoires
          owner: allUserId[Math.floor(Math.random() * allUserId.length + 1)],
        });

        // Uploader l'image principale du produit
        const resultImage = await cloudinary.uploader.upload(
          products[i].product_image,
          {
            folder: `api/vinted/offers/${newOffer._id}`,
            public_id: "preview",
          }
        );

        // Uploader les images de chaque produit
        newProduct_pictures = [];
        for (let j = 0; j < products[i].product_pictures.length; j++) {
          try {
            const resultPictures = await cloudinary.uploader.upload(
              products[i].product_pictures[j],
              {
                folder: `api/vinted/offers/${newOffer._id}`,
              }
            );

            newProduct_pictures.push(resultPictures);
          } catch (error) {
            console.log("uploadCloudinaryError ===> ", error.message);
          }
        }

        newOffer.product_image = resultImage;
        newOffer.product_pictures = newProduct_pictures;

        await newOffer.save();
        console.log(`✅ offer saved : ${i + 1} / ${products.length}`);
      } catch (error) {
        console.log("newOffer error ===> ", error.message);
      }
    }
    res.send("Done !");
    console.log(`🍺 All offers saved !`);
  }
});

module.exports = router;
