# MusicBox

Static site builder. Creates structured HTML and audio player (via Handlebars templates) from ID3 tagged mp3s.

## Usage

* `npm install -g https://github.com/FilipNest/musicbox`
* navigate to a folder with tagged music saved in a `music` directory
* `musicbox`

An `index.html` file will be created in your current directory along with other folders.

### Parameters

You can pass some extra parameters to the function.

* templates = Handlebars templates directory (make copies of the templates provided and roll your own)
* output = where the output will be saved (default current folder) 
* music = where the music is stored (default "music")

Example `musicbox templates=mytemplates output=folder music=mymusic/files
