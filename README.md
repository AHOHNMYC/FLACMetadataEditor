# FLACMetadataEditor
Script allows you to edit metadata in FLAC files

*inspired by [egoroof's Browser ID3 Writer](https://github.com/egoroof/browser-id3-writer)*

# Usage:
```javascript
// # Creating editor instance:
const editor = new FLACMetadataEditor(ArrayBuffer);

// # Get version:
const editorVersion = editor.scriptVersion; // <- e.g. '0.0.2.1'

// # Editing tags:
// List with standard field names: https://xiph.org/vorbis/doc/v-comment
editor.addComment('ARTIST=Laibach');
editor.addComment('ARTIST', 'Laibach');

// All properties are facultative except "data"
// Default values (except "data", of course) presented in example:
editor.addPicture({
    APICtype: 3,
    MIMEType: 'image/jpeg',
    colorDepth: 0,
    colorNumber: 0,
    data: ImageDataAsArrayBuffer,
    description: '',
    width: 0,
    height: 0
});

// remove single atrist
editor.removeComment('ARTIST', 'Laibach');
// remove all atrists
editor.removeComment('ARTIST');
// remove ALL comments
editor.removeComment();

// # Writing changes
editor.serializeMetadata();

// # Convert result to blob
const resultArrayBuffer = editor.arrayBuffer;
const blob = new Blob([resultArrayBuffer], {type: 'audio/flac'});
const url = URL.createObjectURL(blob);
```

# What else?
### Editable full FLAC metadata except CUESHEET
May be accessed through `editor.metadata`

Do `console.log(editor)` to explore it. Structures have self-descriptive names

### Chains
As all public functions return this, we are able to create trains. e.g. this returns changed ArrayBuffer with only one comment — `TITLE=The Whistleblowers`
```javascript
new FLACMetadataEditor(ArrayBuffer).removeComment().addComment('TITLE','The Whistleblowers').serializeMetadata().arrayBuffer;
```

# TODO:
* More debug output
* [METADATA\_BLOCK\_CUESHEET](https://xiph.org/flac/format#metadata_block_cuesheet) parsing (most forums don't recommend use it. Use tag `CUESHEET` instead. And honestly, even `metaflac` cannot embed all of  my `.cue` into flacs. Nevermind)
