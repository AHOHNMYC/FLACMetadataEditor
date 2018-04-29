let downloadArrayBufferAsFlac = (arrBuf, name = '') => {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([arrBuf], {type: 'audio/flac'}));
    a.download = name+'.flac';
    document.head.appendChild(a);
    a.click();
    a.remove();
};

let editor;
let t;

function removeRow(e) {
    e.target.parentElement.parentElement.remove();
}

function addRow(field = '', value = '') {
    let r = t.insertRow();
    let add = type => {
        let c = r.insertCell();
        return c.appendChild(document.createElement(type));
    };

    let i = add('input');
    i.value = field;
    if (!field) i.focus();

    add('input').value = value;

    i = add('button');
    i.textContent = 'X';
    i.addEventListener('click', removeRow);
}

function fillTable() {

    while (t.rows[1]) t.deleteRow(1);

    editor._vorbisComment.comments.toStringArray().forEach(comment=>{
        let field = comment.split('=')[0];
        let value = comment.split('=')[1];
        addRow(field, value);
    })
}

function parseTable() {
    let rows = Array.from(t.rows).slice(1);
    let strings = rows.map(row=>
        (row.cells[0].firstChild.value && row.cells[1].firstChild.value)
            ? row.cells[0].firstChild.value +'='+ row.cells[1].firstChild.value
            : undefined)
        .filter(e=>e!==undefined);
    strings.forEach(string=> editor.addComment(string));
}

function removePicture(e) {
    e.target.parentElement.remove();
    let i = document.getElementById('images');
    if (!i.firstElementChild)
        i.classList.add('hidden');
}

function addPicture(blobUrl, mime, apic = 3) {
    let i = document.getElementById('images');
    i.classList.remove('hidden');

    let d = i.appendChild(document.createElement('div'));
    d.classList.add('image');

    let a = d.appendChild(document.createElement('a'));
    a.target = '_blank';
    a.href = blobUrl;
    a.dataset.mime = mime;
    a.dataset.apic = apic;
    a.appendChild(document.createElement('img')).src = blobUrl;

    let r = d.appendChild(document.createElement('span'));
    r.classList.add('remove_image');
    r.textContent = 'X';
    r.addEventListener('click', removePicture);
}

function fillPictures() {
    let i = document.getElementById('images');
    while (i.firstElementChild)
        i.firstElementChild.remove();

    editor.metadata.blocks.forEach(block=>{
        if (block.blockType === 'PICTURE') {
            let array = block.data.data;
            let apic = block.data.APICtype;
            let mime;
            if (array[0]===0x42 && array[1]===0x4D) mime = 'image/bmp';
            if (array[0]===0x47 && array[1]===0x49 && array[2]===0x46) mime = 'image/gif';
            if (array[0]===0xFF && array[1]===0xD8 && array[2]===0xFF) mime = 'image/jpeg';
            if (array[0]===0x89 && array[1]===0x50 && array[2]===0x4E && array[2]===0x47) mime = 'image/png';
            if (array[0]===0x49 && array[1]===0x49 && array[2]===0x2A && array[3]===0x00) mime = 'image/tiff';
            if (array[0]===0x40 && array[1]===0x40 && array[2]===0x00 && array[3]===0x2A) mime = 'image/tiff';
            if (array[8]===0x57 && array[9]===0x45 && array[10]===0x42 && array[11]===0x50) mime = 'image/webp';

            if (mime !== block.data.MIMEType) console.log('Wrong mime type in source FLAC metadata ~ : %s, real: %s', block.data.MIMEType, mime);

            let url = URL.createObjectURL(new Blob([array], {type: mime}));
            addPicture(url, mime, apic);
        }
    })
}

function parseImages(callback) {
    let counter = 0;

    if (!document.querySelector('#images a')) return callback();

    document.querySelectorAll('#images a').forEach((a, n, arr)=>{
        let xhr = new XMLHttpRequest();
        xhr.open('GET', a.href, true);
        xhr.responseType = 'arraybuffer';
        xhr.addEventListener('load', function(){
            if (this.status !== 200) return;
            editor.addPicture({
                data: xhr.response,
                APICtype: a.dataset.apic,
                MIMEType: a.dataset.mime,
            });

            if (++counter === arr.length)
                callback();
        });
        xhr.send();
    })
}

function processFile(file) {
    let blob = file.slice();

    if (file.type !== 'audio/flac') {
        if (file.type === 'image/bmp'
            || file.type === 'image/gif'
            || file.type === 'image/jpeg'
            || file.type === 'image/png'
            || file.type === 'image/tiff'
            || file.type === 'image/webp') {
            if (!editor) return alert('Open FLAC first');
            let url = URL.createObjectURL(blob);
            return addPicture(url, file.type);
        } else {
            if (!editor) return alert('It\'s not FLAC file');
            return alert('It\'s not FLAC file nor image');
        }
    }

    document.getElementById('drop_text').textContent = file.name;

    let reader = new FileReader();
    reader.addEventListener("loadend", ()=>{
        let arrayBuffer = reader.result;
        editor = new FLACMetadataEditor(arrayBuffer);

        console.log(editor);

        document.getElementById('down_button').classList.remove('hidden');
        document.getElementById('meta_table').classList.remove('hidden');
        fillTable();
        fillPictures();

    });
    reader.readAsArrayBuffer(blob);
}

function processFiles(files) {
    Array.from(files).forEach(processFile);
}

document.addEventListener('drop', e=>{
    e.preventDefault();
    processFiles(e.dataTransfer.files);
    e.dataTransfer.clearData();
});

document.addEventListener('dragover', e=>e.preventDefault());

window.addEventListener('load', ()=>{
    t = document.getElementById('meta_table');

    document.getElementById('down_button').addEventListener('click', e=>{
        editor._vorbisComment.vendorString = "AHOHNMYC's JS FLACMetadataWriter v" + editor.scriptVersion;
        editor.removeComment();
        // Remove images
        editor.metadata.blocks = editor.metadata.blocks.filter(block=>block.blockType!=='PICTURE');

        parseTable();
        parseImages(()=>{
            editor.serializeMetadata();
            downloadArrayBufferAsFlac(editor.arrayBuffer, document.getElementById('drop_text').textContent.replace('.flac', '_edited'));
        });
    });

    document.getElementById('openfile_button').addEventListener('click', e=> {
        let i = document.createElement('input');
        i.type = 'file';
        i.accept = '.flac' + (editor ? ', .bmp, .gif, .jpg, .png, .tif, .tiff, .webp' : '');
        i.addEventListener('change', e=>{
            processFiles(e.path[0].files);
        });
        i.click();
    });

    document.getElementById('add_row_button').addEventListener('click', e=> {
        addRow();
    });

});