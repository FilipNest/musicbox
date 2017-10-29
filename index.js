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

// Allow custom templates directory

let directory;

if (process.argv[2]) {

  directory = process.cwd() + "/" + process.argv[2];

} else {

  directory = __dirname + "/templates";

}

let output

if (process.argv[3]) {

  output = process.cwd() + "/" + process.argv[3];

} else {

  output = process.cwd();

}

const templates = {
  artist: Handlebars.compile(fs.readFileSync(directory + "/artist.html", "utf8")),
  album: Handlebars.compile(fs.readFileSync(directory + "/album.html", "utf8"))
};

// Header and footer partials

Handlebars.registerPartial('header', fs.readFileSync(__dirname + "/templates/header.html", "utf8"));
Handlebars.registerPartial('footer', fs.readFileSync(__dirname + "/templates/footer.html", "utf8"));

Handlebars.registerHelper('trimString', function(string, count) {

  return new Handlebars.SafeString(string.length > count ? string.substring(0, count) + "..." : string);

});

// Search for mp3 files and turn into structured html templates

glob(process.cwd() + "/music/**/*.mp3", {}, function(er, files) {

  let database = {
    paths: {},
    albums: {}
  }

  let counter = 0,
    complete = function() {

      counter++

      if (counter === files.length) {

        // Sort keyed objects into year sorted array for Handlebars template

        database.albums = Object.keys(database.albums).map(function(albumName) {

          var album = database.albums[albumName];

          album.name = albumName;
          album.year = parseInt(album.tracks[0].year);

          if (isNaN(album.year)) {

            album.year = 0;

          }

          return database.albums[albumName]

        }).sort(function(album1, album2) {

          return album2.year - album1.year;

        });

        // fs.removeSync(output);

        Object.keys(database.paths).forEach(function(url) {

          let item = database.paths[url];

          try {

            mkdirp.sync(output + url);

          } catch (e) {
            // Already exists
          }

          fs.writeFileSync(output + url + "/index.html", templates[item.type](item));

        });

      }

    }

  files.forEach(function(file) {

    jsmediatags.read(file, {
      onSuccess: function(output) {

        let track = output.tags;

        if (!database.albums[track.album]) {

          database.albums[track.album] = {
            link: tidyURL(track.artist) + "/" + tidyURL(track.album),
            tracks: []
          };

        }

        // Extract lyrics and add newlines

        if (track.lyrics && track.lyrics.lyrics) {

          if (track.lyrics.lyrics) {

            track.lyrics = track.lyrics.lyrics;

          }

          track.lyrics = track.lyrics.replace(/(\r\n|\n|\r)/gm, '<br>');

        }

        // Extract comment and add newlines

        if (track.comment) {

          track.comment = track.comment.text;

        }

        // Track image processing

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

        database.albums[track.album].tracks.push(track);

        // Order by track number

        database.albums[track.album].tracks = database.albums[track.album].tracks.sort(function(a, b) {

          return parseInt(a.track) - parseInt(b.track);

        })

        database.paths["/albums/" + tidyURL(track.album)] = {
          type: "album",
          album: track.album,
          title: track.album + " by " + track.artist,
          artist: track.artist,
          artistLink: tidyURL(track.artist),
          tracks: database.albums[track.album]
        };

        complete();

      },
      onError: function(error) {
        console.log(':(', error.type, error.info);
      }
    });

  })

})
