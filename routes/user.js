// Import du package 'express'
const express = require("express");
// Appel à la fonction Router(), issue du package 'express'
const router = express.Router();

// uid2 et crypto-js sont des packages qui vont nous servir à encrypter le mot de passe
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// Import du package cloudinary
const cloudinary = require("cloudinary").v2;

// Package qui permet de générer des données aléatoires (ne pas en tenir compte, cela sert à réinitiliser la BDD entre 2 sessions de formation)
const faker = require("faker");
faker.locale = "fr";
const owners = require("../data/owners.json");

// Import du model User et Offer
// afin d'éviter des erreurs (notamment dues à d'eventuelles références entre les collections)
// nous vous conseillons d'importer touts vos models dans toutes vos routes
//
// nous avons besoin de User pour effectuer une recherche dans la BDD
// afin de savoir :
// - si un utilisateur ayant le même email existe déjà ou pas (route signup)
// - quel est l'utilisateur qui souhaite se connecter (route login)
const User = require("../models/User");
const Offer = require("../models/Offer");

// déclaration de la route signup
router.post("/user/signup", async (req, res) => {
  try {
    // Recherche dans la BDD. Est-ce qu'un utilisateur possède cet email ?
    const user = await User.findOne({ email: req.fields.email });

    // Si oui, on renvoie un message et on ne procède pas à l'inscription
    if (user) {
      res.status(409).json({ message: "This email already has an account" });

      // sinon, on passe à la suite...
    } else {
      // l'utilisateur a-t-il bien envoyé les informations requises ?
      if (req.fields.email && req.fields.password && req.fields.username) {
        // Si oui, on peut créer ce nouvel utilisateur

        // Étape 1 : encrypter le mot de passe
        // Générer le token et encrypter le mot de passe
        const token = uid2(64);
        const salt = uid2(64);
        const hash = SHA256(req.fields.password + salt).toString(encBase64);

        // Étape 2 : créer le nouvel utilisateur
        const newUser = new User({
          email: req.fields.email,
          token: token,
          hash: hash,
          salt: salt,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
          },
        });

        // Étape 3 : sauvegarder ce nouvel utilisateur dans la BDD
        await newUser.save();
        res.status(200).json({
          _id: newUser._id,
          email: newUser.email,
          token: newUser.token,
          account: newUser.account,
        });
      } else {
        // l'utilisateur n'a pas envoyé les informations requises ?
        res.status(400).json({ message: "Missing parameters" });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.fields.email });

    if (user) {
      // Est-ce qu'il a rentré le bon mot de passe ?
      // req.fields.password
      // user.hash
      // user.salt
      if (
        SHA256(req.fields.password + user.salt).toString(encBase64) ===
        user.hash
      ) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      res.status(400).json({ message: "User not found" });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ message: error.message });
  }
});

router.get("/reset-users", async (req, res) => {
  // Vider la collection User
  await User.deleteMany({});

  // Supprimer le dossier "api/vinted/users" sur cloudinary

  // Pour cela, il faut supprimer les images, cloudinary ne permettant pas de supprimer des dossiers qui ne sont pas vides
  try {
    const deleteResources = await cloudinary.api.delete_resources_by_prefix(
      "api/vinted/users"
    );
    console.log("deleteResources ===>  ", deleteResources);
  } catch (error) {
    console.log("deleteResources ===>  ", error.message);
  }

  // Maintenant les dossiers vides, on peut les supprimer
  try {
    const deleteFolder = await cloudinary.api.delete_folder("api/vinted/users");
    if (!deleteFolder) {
      console.log("wesh");
    }
  } catch (error) {
    console.log("deleteFolder error ===> ", error.message);
  }

  // Créer les users
  for (let i = 0; i < owners.length; i++) {
    try {
      // Étape 1 : encrypter le mot de passe
      // Générer le token et encrypter le mot de passe
      const token = uid2(64);
      const salt = uid2(64);
      const hash = SHA256("azerty" + salt).toString(encBase64);

      // Étape 2 : créer le nouvel utilisateur
      const newUser = new User({
        email: faker.internet.email().toLowerCase(),
        token: token,
        hash: hash,
        salt: salt,
        account: {
          username: owners[i].owner_name || faker.internet.userName(),
          phone: faker.phone.phoneNumber("06########"),
        },
      });

      // Étape 3 : uploader la photo de profile du user
      const resultImage = await cloudinary.uploader.upload(
        owners[i].owner_image || faker.random.image(),
        {
          folder: `api/vinted/users/${newUser._id}`,
          public_id: "avatar",
        }
      );

      newUser.account.avatar = resultImage;
      // Étape 3 : sauvegarder ce nouvel utilisateur dans la BDD
      await newUser.save();
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ message: error.message });
    }
  }
  res.status(200).json("🍺 All users saved !");
});

module.exports = router;
