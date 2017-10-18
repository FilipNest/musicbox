#!/usr/bin/env node

// Dependencies

const glob = require("glob"),
  jsmediatags = require("jsmediatags"),
  fs = require("fs-extra"),
  btoa = require('btoa'),
  Handlebars = require("handlebars"),
  path = require("path"),
  mkdirp = require("mkdirp");

// Tidy urls

const tidyURL = (text) => text.replace(/[^a-zA-Z0-9-_]/g, '_');

// Handlebars templates

const templates = {
  artist: Handlebars.compile(fs.readFileSync(__dirname + "/templates/artist.html", "utf8")),
  album: Handlebars.compile(fs.readFileSync(__dirname + "/templates/album.html", "utf8")),
  index: Handlebars.compile(fs.readFileSync(__dirname + "/templates/index.html", "utf8"))
};

Handlebars.registerPartial('header', fs.readFileSync(__dirname + "/templates/header.html", "utf8"));
Handlebars.registerPartial('footer', fs.readFileSync(__dirname + "/templates/footer.html", "utf8"));

// Search for mp3 files and turn into structured html templates

glob(process.cwd() + "/music/**/*.mp3", {}, function(er, files) {

  let database = {
    paths: {},
    music: {}
  }

  let counter = 0,
    complete = function() {

      counter++

      if (counter === files.length) {

        fs.removeSync(process.cwd() + "/artists");

        Object.keys(database.paths).forEach(function(url) {

          let item = database.paths[url];

          try {

            mkdirp.sync(process.cwd() + "/artists/" + url);

          } catch (e) {
            // Already exists
          }

          fs.writeFileSync(process.cwd() + "/artists/" + url + "/index.html", templates[item.type](item));

        });

      }

      // Add index with artist directory

      var artistList = Object.keys(database.music).map(function(artist) {

        return {
          name: artist,
          link: "/artists/" + tidyURL(artist)
        }

      })

      fs.writeFileSync(process.cwd() + "/index.html", templates.index({
        artists: artistList
      }));

    }

  files.forEach(function(file) {

    jsmediatags.read(file, {
      onSuccess: function(output) {

        let track = output.tags;

        if (!database.music[track.artist]) {

          database.music[track.artist] = {
            albums: {}
          };

        }

        if (!database.music[track.artist].albums[track.album]) {

          database.music[track.artist].albums[track.album] = {
            link: "/artists/" + tidyURL(track.artist) + "/" + tidyURL(track.album),
            tracks: []
          };

        }

        let image = track.picture;
        if (image) {
          let base64String = "";
          for (let i = 0; i < image.data.length; i++) {
            base64String += String.fromCharCode(image.data[i]);
          }
          let base64 = "data:image/jpeg;base64," +
            btoa(base64String);

          track.picture = base64;

        }

        // Handle OS directory structure

        var dirname = process.cwd().split(path.sep).join("/");

        track.path = file.split(dirname).join("");

        database.music[track.artist].albums[track.album].tracks.push(track);

        // Order by track number

        database.music[track.artist].albums[track.album].tracks = database.music[track.artist].albums[track.album].tracks.sort(function(a, b) {

          return parseInt(a.track) - parseInt(b.track);

        })

        // Shortcuts for path lookup

        database.paths["/" + tidyURL(track.artist)] = {
          type: "artist",
          artist: track.artist,
          albums: database.music[track.artist],
          title: track.artist
        };

        database.paths["/" + tidyURL(track.artist) + "/" + tidyURL(track.album)] = {
          type: "album",
          album: track.album,
          title: track.album + " by " + track.artist,
          artist: track.artist,
          artistLink: "/artists/" + tidyURL(track.artist),
          tracks: database.music[track.artist].albums[track.album]
        };

        complete();

      },
      onError: function(error) {
        console.log(':(', error.type, error.info);
      }
    });

  })

})