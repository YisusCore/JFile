$ = typeof $ == 'undefined'?jQuery:$;
$J = typeof $J == 'undefined'?{}:$J;

if(typeof $.event.props!='undefined') $.event.props.push("dataTransfer");

/*
 * jFile Allowed:
 *     - image/*        - image/x-png    
 *     - image/gif      - image/jpeg     
 *     - .gif           - .jpg           
 *     - .jpeg          - .png           
 *     - .doc           - .docx          
 *
 * jFile maxFiles:
 *     - 0   :  sin limite               
 *     - 1   :  no-multiple              
 *     - >1  :  multiple                 
 *
 * jFile maxFilesSize:
 *     - 0   :  sin limite               
 *     - >0  :  peso en MB               
 */
$J.jFile = {
    _state:-1,
    $_s:[],
    errors:["Navegador No soporta", "Demasiados Archivos", "Archivo muy largo", "Archivo no autorizado", "No encontrado", "No leible", "Error de Aborto", "Error de Lectura"],
    defs:{request:{url: location.base + '/uploader.php', type:'POST', paramname:'archivo', params:{}, headers:{}, credentials:undefined}, allowed:[], maxFiles:0, maxFilesSize:5, imgCropResz:false},
    queue:[],
    queueProcesing:undefined,
    queueNext:function(){
        for(x in $J.jFile.queue){
            y=$J.jFile.queue[x];
            if(typeof y=='function') continue;
            if(y._state>0 || !y._procesable || !y.file.reader.readyforsend) continue;
            return [x, y];
        }
        return undefined;
    },
    uploadingImg:'assets/img/uploading.gif',
    upload:function($qI){
        if(typeof $qI=='undefined'){
            $J.jFile.queueProcesing=undefined;
            $J.jFile._state=0;
            return;
        }

        $J.jFile.queueProcesing = $qI;
        $J.jFile.queueProcesing[1].$_.trigger('beforeUpload.jys.jFile', {file:$J.jFile.queueProcesing[1].file});
        $J.jFile.queue[$J.jFile.queueProcesing[0]]._state = 0;

        $J.jFile.queueProcesing[1].$_.trigger('beforeUploadSend.jys.jFile', {file:$J.jFile.queueProcesing[1].file});

        var xhr = new XMLHttpRequest(),
            upload = xhr.upload,
            file = $J.jFile.queueProcesing[1].file,
            start_time = new Date().getTime(),
            boundary = '------multipartformboundary' + (new Date()).getTime(),
            builder,
            mime = file.type;

        if (typeof $J.jFile.queueProcesing[1].$_.jFdata().request.credentials!='undefined') {
            xhr.withCredentials = $J.jFile.queueProcesing[1].$_.jFdata().request.credentials;
        }

        var data = atob(file.reader.dataloaded.split(',')[1]);
        builder = $J.jFile.getBuilder(file.name, data, mime, boundary, typeof file.params!='undefined'?file.params:{});

        upload.downloadStartTime = start_time;
        upload.currentStart      = start_time;
        upload.currentProgress   = 0;
        upload.startData = 0;
        upload.addEventListener("progress", $J.jFile.uploadProgress, false);

        $J.jFile.queueProcesing[2] = xhr;

        xhr.open($J.jFile.queueProcesing[1].$_.jFdata().request.type, $J.jFile.queueProcesing[1].$_.jFdata().request.url, true);

        xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        $.each($J.jFile.queueProcesing[1].$_.jFdata().request.headers, function(k, v) {
            xhr.setRequestHeader(k, v);
        });

        xhr.onload = function(e){
            var serverResponse = null;
            if (xhr.responseText) {
                try {
                    serverResponse = $.parseJSON(xhr.responseText);
                }catch (e){
                    serverResponse = xhr.responseText;
                }
            }
            this.serverResponse = serverResponse;

            var now = new Date().getTime(),
                timeDiff = now - this.upload.downloadStartTime;
            
            if (xhr.status < 200 || xhr.status > 299){
                $J.jFile.queue[$J.jFile.queueProcesing[0]]._state = 2;//Error al Recibir
                $J.jFile.queueProcesing[1].$_.trigger('uploadItemError.jys.jFile', {'status':xhr.status, 'statusText':xhr.statusText, file:$J.jFile.queueProcesing[1].file});
                $J.jFile.queueProcesing[1].$_.jFdata().trgStatus.html('Se produjo error al enviar el archivo <small>'+$J.jFile.queueProcesing[1].file.name+'</small>');
                $J.jFile.cargas.error++;
            }else{
                $J.jFile.queue[$J.jFile.queueProcesing[0]]._state = 3;//Enviado y Recibido Correctamente
                $J.jFile.queueProcesing[1].$_.trigger('uploadItemDone.jys.jFile', {'serverResponse':serverResponse, file:$J.jFile.queueProcesing[1].file, 'timeDiff':timeDiff});
                $J.jFile.cargas.done++;
                $J.jFile.queueProcesing[1].$_.jFdata().trgStatus.html('Archivo cargado correctamente <small>'+$J.jFile.queueProcesing[1].file.name+'</small>');

                if(typeof $J.jFile.queueProcesing[1].$_.jFdata().trgResult!='undefined'){
                    $J.jFile.queueProcesing[1].$_.jFdata().trgResult.val(typeof serverResponse.href!='undefined'?serverResponse.href:serverResponse);
                }
            }
            $J.jFile.queueProcesing[1].$_.jFdata().procesing.splice($J.jFile.queueProcesing[1].$_.jFdata().procesing.indexOf($J.jFile.queueProcesing[0]), 1)
            $J.jFile.queueProcesing = undefined;
            $J.jFile.upload($J.jFile.queueNext());
        };

        if(!xhr.sendAsBinary){xhr.sendAsBinary = function(datastr){function byteValue(x){return x.charCodeAt(0) & 0xff;}var ords = Array.prototype.map.call(datastr, byteValue);var ui8a = new Uint8Array(ords);this.send(ui8a.buffer);}}

        $J.jFile.queue[$J.jFile.queueProcesing[0]]._state = 1;//Enviado
        $J.jFile.queueProcesing[1].$_.trigger('uploadItemStart.jys.jFile', {file:$J.jFile.queueProcesing[1].file});
        $J.jFile.queueProcesing[1].$_.jFdata().trgStatus.html('Cargando Archivo <small>'+$J.jFile.queueProcesing[1].file.name+'</small> <span class="percentage">0%</span>');

        xhr.sendAsBinary(builder);
        return;
    },
    cargas:{
        total:0,
        done:0,
        error:0,
    },
    uploadProgress:function(e){
        if(typeof $J.jFile.queueProcesing=='undefined') return;

        if (e.lengthComputable) {
            var percentage = Math.round((e.loaded * 100) / e.total);
            
            if ($J.jFile.queueProcesing[2].upload.currentProgress !== percentage) {
                $J.jFile.queueProcesing[2].upload.currentProgress = percentage;

                $J.jFile.queueProcesing[1].$_.trigger('uploadItemProgress.jys.jFile', {file:$J.jFile.queueProcesing[1].file, 'percentage':percentage});
                $J.jFile.queueProcesing[1].$_.jFdata().trgStatus.find('.percentage').html(percentage+'%');

                var elapsed = new Date().getTime();
                var diffTime = elapsed - $J.jFile.queueProcesing[2].upload.currentStart;

                if (diffTime >= 1000) {
                    var diffData = e.loaded - $J.jFile.queueProcesing[2].upload.startData;
                    var speed = diffData / diffTime; // KB per second

                    $J.jFile.queueProcesing[1].$_.trigger('speed.jys.jFile', {file:$J.jFile.queueProcesing[1].file, 'speed':speed});
                    
                    $J.jFile.queueProcesing[2].upload.startData = e.loaded;
                    $J.jFile.queueProcesing[2].upload.currentStart = elapsed;
                }
            }
        }
    },
    getBuilder:function(filename, filedata, mime, boundary, extraparams){
        var dashdash = '--',
            crlf = '\r\n',
            builder = '',
            paramname = $J.jFile.queueProcesing[1].$_.jFdata().request.paramname;

        $.each($J.jFile.queueProcesing[1].$_.jFdata().request.params, function(k, v) {
            builder += dashdash;
            builder += boundary;
            builder += crlf;
            builder += 'Content-Disposition: form-data; name="' + k + '"';
            builder += crlf;
            builder += crlf;
            builder += encodeURIComponent(v);
            builder += crlf;
        });

        if(typeof extraparams!='undefined')
        $.each(extraparams, function(k, v) {
            builder += dashdash;
            builder += boundary;
            builder += crlf;
            builder += 'Content-Disposition: form-data; name="' + k + '"';
            builder += crlf;
            builder += crlf;
            builder += encodeURIComponent(v);
            builder += crlf;
        });

        if ($.isFunction(paramname)){
            paramname = paramname(filename, $J.jFile.queueProcesing[1].$_);
        }

        builder += dashdash;
        builder += boundary;
        builder += crlf;
        builder += 'Content-Disposition: form-data; name="' + (paramname||$J.jFile.defs.request.paramname) + '"';
        builder += '; filename="' + encodeURIComponent(filename) + '"';
        builder += crlf;
        builder += 'Content-Type: ' + mime;
        builder += crlf;
        builder += crlf;
        builder += filedata;
        builder += crlf;

        builder += dashdash;
        builder += boundary;
        builder += dashdash;
        builder += crlf;

        return builder;
    },
    initUpload:function(){
        if($J.jFile._state>=1) return;
        $J.jFile._state = 1;
        $J.jFile.upload($J.jFile.queueNext());
        return;
    },
    addToQueue:function($_, files){
        $jF = $_.jFdata();
    
        if(!files){
            $_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':0, 'log':$J.jFile.errors[0]});
            $_.jFdata().trgStatus.html($J.jFile.errors[0]);
            return false;
        }
    
        if (files.length > $_.jFdata().maxfiles && $_.jFdata().maxfiles > 0){
            $_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':1, 'log':$J.jFile.errors[1]});
            $_.jFdata().trgStatus.html($J.jFile.errors[1]);
            return false;
        }

        for(var fileIndex = files.length;fileIndex--;){
            if (files[fileIndex].size > $_.jFdata().maxFilesSize*1048576 && $_.jFdata().maxFilesSize > 0){
                $_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':2, 'log':$J.jFile.errors[2], 'file':files[fileIndex]});
                $_.jFdata().trgStatus.html($J.jFile.errors[2] +' <small>'+files[fileIndex].name+' ('+Math.round(files[fileIndex].size/1048576*100)/100+'Mb)</small>');
                continue;
            }

            if($_.jFdata().allowed.length>0){
                var allowed = false; 
                $.each($_.jFdata().allowed, function(i, el){
                    if(/^(\*){0,1}\.(.+)$/gi.test(el)){//extension
                        el=el.replace(/^\*/gi, '');
                        fn_ = files[fileIndex].name;
                        fl_ = fn_.length - el.length;
                        if(fn_.substr(fl_).toLowerCase() == el.toLowerCase()){
                            allowed = true;
                        }
                    }
                    else
                    if(/^(.+)\/(\*){0,1}$/gi.test(el)){//tipo
                        el=el.replace(/\*$/gi, '');
                        fn_ = files[fileIndex].type;
                        if(fn_.substr(0, el.length).toLowerCase() == el.toLowerCase()){
                            allowed = true;
                        }
                    }
                    else
                    if(/^(.+)\/([^\.]*)$/gi.test(el)){//tipo without *
                        fn_ = files[fileIndex].type;
                        if(fn_.substr(0, el.length).toLowerCase() == el.toLowerCase()){
                            allowed = true;
                        }
                    }
                    else
                    {
                        console.log('<<'+el+'>> not allowed')
                    }
                });

                if(!allowed){
                    $_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':3, 'log':$J.jFile.errors[3], 'file':files[fileIndex]});
                    $_.jFdata().trgStatus.html($J.jFile.errors[3] +' <small>'+files[fileIndex].name+'</small>');
                    continue;
                }
            }

            try {
                files[fileIndex].reader = new FileReader();
            }catch (err){
                $_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':0, 'log':$J.jFile.errors[0]});
                $_.jFdata().trgStatus.html($J.jFile.errors[0]);
                console.log(err);
                return false;
            }

            files[fileIndex].isImage = /^image\//gi.test(files[fileIndex].type);

            files[fileIndex].reader.$_ = $_;
            files[fileIndex].reader.file = files[fileIndex];
            files[fileIndex].reader.onerror = function(e){
                switch(e.target.error.code){
                    case e.target.error.NOT_FOUND_ERR:
                        this.$_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':4, 'log':$J.jFile.errors[4]});
                        this.$_.jFdata().trgStatus.html($J.jFile.errors[4]);
                        break;
                    case e.target.error.NOT_READABLE_ERR:
                        this.$_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':5, 'log':$J.jFile.errors[5]});
                        this.$_.jFdata().trgStatus.html($J.jFile.errors[5]);
                        break;
                    case e.target.error.ABORT_ERR:
                        this.$_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':6, 'log':$J.jFile.errors[6]});
                        this.$_.jFdata().trgStatus.html($J.jFile.errors[6]);
                        break;
                    default:
                        this.$_.trigger('error.jys.jFile', {'tipo':'addToQueue', 'error':7, 'log':$J.jFile.errors[7]});
                        this.$_.jFdata().trgStatus.html($J.jFile.errors[7]);
                        break;
                };
                return false;
            };

            files[fileIndex].reader.readyforsend = false;
            files[fileIndex].reader.dataloaded;
            files[fileIndex].reader.onloadend = function(e){
                this.dataloaded = e.target.result;
                this.readyforsend=true;
                
                if(typeof this.$_.jFdata().trgPreview!='undefined'){
                    this.$_.jFdata().trgPreview[0].src=e.target.result;
                    this.$_.jFdata().trgPreview[0].title=escape(this.file.name);
                }

                if(this.file.isImage){
                    this.readyforsend=false;

                    this.file.isImage = true;
                    this.file.preimage = new Image();
                    this.file.preimage.$_ = this.$_;
                    this.file.preimage.file = this.file;

                    this.file.preimage.onload = function(){
                        this.file.reader.dataloaded = this.src;
                        this.file.reader.readyforsend=true;
                        this.file.preimage.onload=undefined;

                        this.file.preimage.$_.trigger('imgPrepared.queued.jys.jFile', {file:this.file});
                        this.file.preimage.$_.jFdata().trgStatus.html('Imagen preparada para ser cargada');
                        if($J.jFile._state<=0) $J.jFile.initUpload();
                    };
                    this.file.preimage.src = e.target.result;
                }else{
                    $_.trigger('filePrepared.queued.jys.jFile', {file:this.file});
                    if($J.jFile._state<=0) $J.jFile.initUpload();
                }
            };
            files[fileIndex].reader.readAsDataURL(files[fileIndex]);

            $J.jFile.queue.push({'$_':$_, 'file':files[fileIndex], _state:-1, _procesable:true});
            $J.jFile.cargas.total++;
            $_.jFdata().procesing.push($J.jFile.queue.length-1);

            if($_.jFdata().maxFiles>0 && $_.jFdata().procesing.length>$_.jFdata().maxFiles){
                //Eliminar envios que anteriores que superan la cantidad de archivos maximos
            }
            files[fileIndex].queueId = $J.jFile.queue.length-1
            $_.trigger('queued.jys.jFile', {file:files[fileIndex]});
            $_.jFdata().trgStatus.html('Archivo preparado para ser cargado');
        }

        if(typeof $_.jFdata().trgPreview!='undefined'){
            $_.jFdata().trgPreview[0].src=$J.jFile.uploadingImg;
            $_.jFdata().trgPreview[0].title='Cargando';
        }

        if($J.jFile._state<=0) $J.jFile.initUpload();
    }
};

$.fn.jFdata = function(){return $(this).data('jF').$_.data('jF');}
$.fn.jFile = function(options){
	if(typeof options=='undefined')options = {};
    if(typeof options!='undefined'){
		if(typeof options.request=='undefined')options.request = {};
		if(typeof options.allowed=='undefined')options.allowed = [];
        options.request = $.extend($J.jFile.defs.request, options.request);
        options.allowed = $.extend($J.jFile.defs.allowed, options.allowed);
    }

    options = $.extend({request:{}, allowed:[], maxFiles:$J.jFile.defs.maxFiles, maxFilesSize:$J.jFile.defs.maxFilesSize, imgCropResz:$J.jFile.defs.imgCropResz}, options);
    if(options.imgCropResz===true) options.imgCropResz = {};

    $('html, body').trigger('init.jys.jFile', {$_:$(this), 'options':options});

    $(this).each(function(){
        $this=$(this);
        $this.trigger('init.jys.jFile', {'options':options});
        
        $tag = $this[0].tagName.toLowerCase();
        
        var $jF = {$_:$this, trgFile:undefined, trgDropper:undefined, trgChange:undefined, trgStatus:undefined, trgPreview:undefined, trgResult:undefined};
            $jF.doc_leave_timer = undefined;
            $jF.request = options.request;
            $jF.allowed = options.allowed;
            $jF.imgCropResz = options.imgCropResz;
            $jF.maxFiles = options.maxFiles*1;
            $jF.maxFilesSize = options.maxFilesSize*1;
            $jF.procesing = [];

        if($tag=='div' && $this.hasClass('jFile')){
            /*
<div class="jFile <<multiple || image>>">
    <div class="contenido">
        <span class="icono"><i class="jys-camera"></i></span>
        <span class="nombre"></span>
    </div>
    <button class="btn btn-primary change" hasFile="no">Agregar</button>
    <button class="btn btn-default change" hasFile="yes">Cambiar</button>
</div>
            */
            if($this.find('input[type="file"]').length>0)
                $jF.trgFile = $this;

            $jF.trgDropper = $this.find('div.contenido');
            $jF.trgChange = $this.find('button.change');
            $jF.trgStatus = $this.find('div.contenido>span.nombre');

            if(typeof $jF.trgFile!='undefined'){
                if(typeof $jF.trgFile.attr('name')!='undefined'){
                    $jF.trgFile.after('<input type="hidden" id="jFtrgFileInp_'+$jF.trgFile.attr('name')+'" name="'+$jF.trgFile.attr('name')+'" />');
                    $jF.trgResult = $('#jFtrgFileInp_'+$jF.trgFile.attr('name'));
                    $jF.trgFile.removeAttr('name');
                }
            }else{
                if($this.hasClass('multiple')){
                    $jF.maxFiles = 0;
                }else{
                    $jF.maxFiles = 1;
                }
            }

            if($this.hasClass('image')){
                $jF.allowed.push('image/*');
            }
        }else if($tag=='input' && $this.attr('type').toLowerCase()=='file'){
            $jF.trgFile = $this;
            if(typeof $jF.trgFile.attr('name')!='undefined'){
                $jF.trgFile.after('<input type="hidden" id="jFtrgFileInp_'+$jF.trgFile.attr('name')+'" name="'+$jF.trgFile.attr('name')+'" />');
                $jF.trgResult = $('#jFtrgFileInp_'+$jF.trgFile.attr('name'));
                $jF.trgFile.removeAttr('name');
            }

            if(typeof $this.attr('data-dropper')!='undefined')
                if($($this.attr('data-dropper')).length>0){
                    $jF.trgDropper = $($this.attr('data-dropper'));
                }

            if(typeof $this.attr('data-changer')!='undefined')
                if($($this.attr('data-changer')).length>0){
                    $jF.trgChange = $($this.attr('data-changer'));
                }

            if(typeof $this.attr('data-status')!='undefined')
                if($($this.attr('data-status')).length>0){
                    $jF.trgStatus = $($this.attr('data-status'));
                }

            if(typeof $this.attr('data-preview')!='undefined')
                if($($this.attr('data-preview')).length>0){
                    $jF.trgPreview = $($this.attr('data-preview'));
                }

            if(typeof $this.attr('data-result')!='undefined')
                if($($this.attr('data-result')).length>0){
                    $jF.trgResult = $($this.attr('data-result'));
                }
        }else if($tag=='img'){
            $jF.trgPreview = $this;

            if(typeof $this.attr('data-file')!='undefined')
                if($($this.attr('data-file')).length>0){
                    if($($this.attr('data-file'))[0].tagName.toLowerCase()=='input' && $($this.attr('data-file')).attr('type').toLowerCase()=='file')
                        $jF.trgFile = $($this.attr('data-file'));
                }

            if(typeof $this.attr('data-dropper')!='undefined'){
                if($($this.attr('data-dropper')).length>0){
                    $jF.trgDropper = $($this.attr('data-dropper'));
                }
            }else{
                $jF.trgDropper = $this;
            }

            if(typeof $this.attr('data-changer')!='undefined')
                if($($this.attr('data-changer')).length>0){
                    $jF.trgChange = $($this.attr('data-changer'));
                }

            if(typeof $this.attr('data-status')!='undefined')
                if($($this.attr('data-status')).length>0){
                    $jF.trgStatus = $($this.attr('data-status'));
                }

            if(typeof $this.attr('data-result')!='undefined')
                if($($this.attr('data-result')).length>0){
                    $jF.trgResult = $($this.attr('data-result'));
                }
        }else{
            if(typeof $this.attr('data-file')!='undefined')
                if($this.find($this.attr('data-file')).length>0){
                    if($this.find($this.attr('data-file'))[0].tagName.toLowerCase()=='input' && $this.find($this.attr('data-file')).attr('type').toLowerCase()=='file')
                        $jF.trgFile = $this.find($this.attr('data-file'));
                }else if($($this.attr('data-file')).length>0){
                    if($($this.attr('data-file'))[0].tagName.toLowerCase()=='input' && $($this.attr('data-file')).attr('type').toLowerCase()=='file')
                        $jF.trgFile = $($this.attr('data-file'));
                }

            if(typeof $this.attr('data-dropper')!='undefined')
                if($this.find($this.attr('data-dropper')).length>0){
                    $jF.trgDropper = $this.find($this.attr('data-dropper'));
                }else if($($this.attr('data-dropper')).length>0){
                    $jF.trgDropper = $($this.attr('data-dropper'));
                }

            if(typeof $this.attr('data-changer')!='undefined')
                if($($this.attr('data-changer')).length>0){
                    $jF.trgChange = $($this.attr('data-changer'));
                }

            if(typeof $this.attr('data-status')!='undefined')
                if($($this.attr('data-status')).length>0){
                    $jF.trgStatus = $($this.attr('data-status'));
                }

            if(typeof $this.attr('data-preview')!='undefined')
                if($($this.attr('data-preview')).length>0){
                    $jF.trgPreview = $($this.attr('data-preview'));
                }

            if(typeof $this.attr('data-result')!='undefined')
                if($($this.attr('data-result')).length>0){
                    $jF.trgResult = $($this.attr('data-result'));
                }

            if(typeof $jF.trgChange=='undefined')
                $this.click(function(e){$(this).jFdata().trgFile.trigger(e);});
        }

        if(typeof $jF.trgFile == 'undefined'){
            $jF.trgFile = document.createElement('input');
            $jF.trgFile.type = 'file';
            $jF.trgFile = $($jF.trgFile);
        }else{
            if(typeof $jF.trgFile.attr('multiple')!='undefined' && $jF.maxFiles==1){
                $jF.maxFiles = 0;
            }else{
                $jF.maxFiles = 1;
            }

            if(typeof $jF.trgFile.attr('accept')!='undefined'){
                $.each($jF.trgFile.attr('accept').split(','), function(i, el){if(el.trim()=='')return; $jF.allowed.push(el.trim());});
            }
        }

        if(typeof $jF.allowed.removeDuplicates!='undefined')
            $jF.allowed = $jF.allowed.removeDuplicates();

        if($jF.maxFiles==1){
            $jF.trgFile.removeAttr('multiple');
        }else if($jF.maxFiles>1){
            $jF.trgFile.attr('multiple', 'multiple');
        }

        if($jF.allowed.length==0){
            $jF.trgFile.removeAttr('accept');
        }else{
            if(typeof $jF.allowed.implode!='undefined')
                $jF.trgFile.attr('accept', $jF.allowed.implode(','));
        }

        if(typeof $jF.trgStatus == 'undefined'){
            $jF.trgStatus = document.createElement('label');
            $jF.trgStatus = $($jF.trgStatus);
            $('body').append($jF.trgStatus);
            $jF.trgStatus.css({'position':'fixed', 'bottom':'10px', 'right':'10px', 'width':'auto', 'min-width':'50px', 'margin':'0px', 'z-index':'1000'}).addClass('label label-info jFtrgFileStatus SPMoveScrolled');
        }

        $jF.trgFile.data('jF', {$_:$this});
        $jF.trgStatus.data('jF', {$_:$this});

        $jF.trgFile.change(function(e){
            var files = e.target.files;
            if(files === null || files === undefined || files.length === 0) {
                $(this).data('jF').$_.trigger('error.jys.jFile', {'tipo':'drop', 'error':-1});
                return false;
            }
            
            $J.jFile.addToQueue($(this).data('jF').$_, files);

            e.preventDefault();
            return false;
        })

        if(typeof $jF.trgDropper != 'undefined'){
            $jF.trgDropper.data('jF', {$_:$this});

            $jF.trgDropper
                .on('drop', function(e){
                    if(!e.dataTransfer) return;
                    var files = e.dataTransfer.files;
                    if(files === null || files === undefined || files.length === 0) {
                        $(this).data('jF').$_.trigger('error.jys.jFile', {'tipo':'drop', 'error':-1});
                        return false;
                    }
                    $J.jFile.addToQueue($(this).data('jF').$_, files);
                    e.preventDefault();
                    return false;
                })
                .on('dragstart', function(e){$(this).addClass('dragging'); })
                .on('dragenter', function(e){$(this).addClass('dragging_enter');clearTimeout($(this).jFdata().doc_leave_timer);e.preventDefault();})
                .on('dragover', function(e){$(this).addClass('dragging_over');clearTimeout($(this).jFdata().doc_leave_timer);e.preventDefault();$(document).bind('dragover');})
                .on('dragleave', function(e){$(this).removeClass('dragging').removeClass('dragging_enter').removeClass('dragging_over');clearTimeout($(this).jFdata().doc_leave_timer);e.stopPropagation();})

            if(!$jF.trgDropper.hasClass('disallowClick'))
                $jF.trgDropper.on('click', function(e){$(this).jFdata().trgFile.trigger(e);});
        }

        if(typeof $jF.trgChange != 'undefined'){
            $jF.trgChange.data('jF', {$_:$this});
            $jF.trgChange.on('click', function(e){$(this).jFdata().trgFile.trigger(e);});
        }

        if(typeof $jF.trgPreview != 'undefined'){
            $jF.trgPreview.data('jF', {$_:$this});
        }

        if(typeof $jF.trgResult != 'undefined'){
            $jF.trgResult.data('jF', {$_:$this});
        }

        if(!(options.imgCropResz===false)){
            $this.on('imgPrepared.queued.jys.jFile', function(e, opts){
                $J.jFile.queue[opts.file.queueId]._procesable = false;

                $(this).jFdata().imgCropResz = $.extend({minSelect:[10,10]}, $(this).jFdata().imgCropResz, {
                    onChange: function(t) {
                        if(parseInt(t.w) <=0) return;

                        $jfcrd = $(this.ui.holder[0]).parents('.jFileCropReszDiv');
                        
                        $jfcrd.find('.forInfo.x1').val(Math.round(t.x*100)/100/1);
                        $jfcrd.find('.forInfo.y1').val(Math.round(t.y*100)/100/1);
                        $jfcrd.find('.forInfo.x2').val(Math.round(t.x2*100)/100/1);
                        $jfcrd.find('.forInfo.y2').val(Math.round(t.y2*100)/100/1);
                        
                        aspecto = (String)(Math.round((t.w/t.h)*100)/100/1)+':1';
                        $jfcrd.find('.forInfo.aspecto').html(aspecto);
                        
                        if(parseInt(t.w) > 0 && $jfcrd.find('img.preview').length>=1){
                            var e = $jfcrd.find('img.preview').parent().width() / t.w,
                                a = $jfcrd.find('img.preview').parent().height() / t.h,
                                b = this.getBounds();
                            $jfcrd.find('img.preview').css({
                                width: Math.round(e * b[0]) + "px",
                                height: Math.round(a * b[1]) + "px",
                                marginLeft: "-" + Math.round(e * t.x) + "px",
                                marginTop: "-" + Math.round(a * t.y) + "px"
                            })
                        }
                    },
                    onSelect: function(t) {
                        if(parseInt(t.w) <=0) return;

                        $jfcrd = $(this.ui.holder[0]).parents('.jFileCropReszDiv');
                        
                        $jfcrd.find('.forInfo.x1').val(Math.round(t.x*100)/100/1);
                        $jfcrd.find('.forInfo.y1').val(Math.round(t.y*100)/100/1);
                        $jfcrd.find('.forInfo.x2').val(Math.round(t.x2*100)/100/1);
                        $jfcrd.find('.forInfo.y2').val(Math.round(t.y2*100)/100/1);
                        
                        aspecto = (String)(Math.round((t.w/t.h)*100)/100/1)+':1';
                        $jfcrd.find('.forInfo.aspecto').html(aspecto);
                        
                        if(parseInt(t.w) > 0 && $jfcrd.find('img.preview').length>=1){
                            var e = $jfcrd.find('img.preview').parent().width() / t.w,
                                a = $jfcrd.find('img.preview').parent().height() / t.h,
                                b = this.getBounds();
                            $jfcrd.find('img.preview').css({
                                width: Math.round(e * b[0]) + "px",
                                height: Math.round(a * b[1]) + "px",
                                marginLeft: "-" + Math.round(e * t.x) + "px",
                                marginTop: "-" + Math.round(a * t.y) + "px"
                            })
                        }
                    },
                    onRelease: function(t){
                        $jfcrd = $(this.ui.holder[0]).parents('.jFileCropReszDiv');
                        this.setSelect([$jfcrd.find('.forInfo.x1').val(), $jfcrd.find('.forInfo.y1').val(), $jfcrd.find('.forInfo.x2').val(), $jfcrd.find('.forInfo.y2').val()])
                    },
                });

                preview = !(typeof $(this).jFdata().imgCropResz.aspectRatio=='undefined' || $(this).jFdata().imgCropResz.aspectRatio==0);
                if($('#jFileCropReszDiv_'+opts.file.queueId).length<=0)
                $('body').append('<div id="jFileCropReszDiv_'+opts.file.queueId+'" class="modal in jFileCropReszDiv" role="dialog" data-backdrop="static" data-keyboard="false" data-show="true"><style>.jcrop-keymgr{left:-300% !important;}</style><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><button type="button" class="btn btn-default pull-right rotate anticlock"><i class="jys-ccw"></i></button><button type="button" class="btn btn-default pull-right rotate clock"><i class="jys-cw"></i></button><h4 class="modal-title">Cortar Imagen</h4></div><div class="modal-body"><div class="row"><div style="display:inline-block;width:'+(preview?'calc(100% - 310px)':'100%')+'"><img src="'+opts.file.preimage.src+'" style="max-width: 100%;" /></div>'+(preview?('<div style="float:right;overflow:hidden;width:300px;height:'+(300/$(this).jFdata().imgCropResz.aspectRatio/1)+'px;"><img src="'+opts.file.preimage.src+'" style="width:100%;" class="preview" /></div>'):'')+'</div><div class="row"><div class="col-xs-2">X1: <input type="text" style="display: inline-block;width: 75px;" readonly class="form-control forInfo x1" /></div><div class="col-xs-2">Y1: <input type="text" style="display: inline-block;width: 75px;" readonly class="form-control forInfo y1" /></div><div class="col-xs-2">X2: <input type="text" style="display: inline-block;width: 75px;" readonly class="form-control forInfo x2" /></div><div class="col-xs-2">Y2: <input type="text" style="display: inline-block;width: 75px;" readonly class="form-control forInfo y2" /></div><div class="col-xs-3 col-xs-offset-1"><span class="form-control">Aspecto: <b style="display: inline-block;width: 75px;" class="forInfo aspecto" ></b></span></div></div></div><div class="modal-footer"><button type="button" class="btn btn-danger btnCancelar">Cancelar</button><button type="button" class="btn btn-primary btnProcesar">Procesar</button></div></div></div></div>');

                $(this).jFdata().trgStatus.html('Imagen está siendo procesada');

                $('#jFileCropReszDiv_'+opts.file.queueId).data({'file':opts.file, jF:$(this).jFdata()});
                
                $('#jFileCropReszDiv_'+opts.file.queueId+' .modal-header button.rotate').off().click(function(e){
                    var $this = $(this).parents('.jFileCropReszDiv'),
                        file = $this.data('file'),
                        $clock = $(this).hasClass('clock');
                    var preimage = file.preimage;
                    if(typeof preimage.crt == 'undefined') preimage.crt = 0;

                    var canvas = document.createElement('canvas');
                        canvas.width = preimage.height;
                        canvas.height = preimage.width;
                    var ctx = canvas.getContext("2d");
                    
                    if($clock){
                        ctx.rotate(0.5 * Math.PI);
                        ctx.translate(0, -canvas.height);
                        
                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(preimage, 0, preimage.width-canvas.width, canvas.height, canvas.width);
                    }else{
                        ctx.rotate(-0.5 * Math.PI);
                        ctx.translate(-canvas.width, 0);
                        
                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(preimage, preimage.height-canvas.height, 0, canvas.height, canvas.width);
                    }

                    file.reader.readyforsend=false;
                    preimage.onload = function(){
                        this.file.reader.dataloaded = this.src;
                        this.file.reader.readyforsend=true;
                        this.onload=undefined;

                        this.file.jcrop.destroy();
                        $('#jFileCropReszDiv_'+this.file.queueId+' .modal-body img.preview').attr('src', this.src);
                        $('#jFileCropReszDiv_'+this.file.queueId+' .modal-body img:eq(0)')[0].src = this.src
                        $('#jFileCropReszDiv_'+this.file.queueId+' .modal-body img:eq(0)').height(this.height*$('#jFileCropReszDiv_'+this.file.queueId+' .modal-body img:eq(0)').width()/this.width);
                        $('#jFileCropReszDiv_'+this.file.queueId+' .modal-body img:eq(0)').Jcrop($(this.file.preimage.$_).jFdata().imgCropResz, function() {
                                $(this.ui.holder[0]).parents('.jFileCropReszDiv').data('file').jcrop = this;
                                var t = this.getBounds();
                                this.setSelect([0, 0, t[0], t[1]])
                            });

                        this.file.preimage.$_.trigger('imgPrepared.queued.jys.jFile', {file:this.file});
                        this.file.preimage.$_.jFdata().trgStatus.html('Imagen preparada para ser cargada');
                        if($J.jFile._state<=0) $J.jFile.initUpload();
                    };
                    
                    preimage.src = canvas.toDataURL(file.type);
                    canvas = undefined;
                    return;
                })

                $('#jFileCropReszDiv_'+opts.file.queueId+' .modal-footer button.btnCancelar').off().click(function(e){
                    var $this = $(this).parents('.jFileCropReszDiv'),
                        file = $this.data('file'),
                        queueId = file.queueId;
                    
                    $J.jFile.queue[queueId]._state = 99;//Cancelado por usuario
                    $J.jFile.queue[queueId].$_.trigger('uploadItemCanceled.jys.jFile', {'file':file});
                    $J.jFile.queue[queueId].$_.jFdata().trgStatus.html('Carga cancelada por usuario');
                    $J.jFile.cargas.error++;
                    $J.jFile.queue[queueId].$_.jFdata().procesing.splice($J.jFile.queue[queueId].$_.jFdata().procesing.indexOf(queueId), 1)
                    $J.jFile.initUpload();
                    $this.off().on('hidden.bs.modal', function(){ $(this).remove(); });
                    $this.modal('hide');
                    return;
                });

                $('#jFileCropReszDiv_'+opts.file.queueId+' .modal-footer button.btnProcesar').off().click(function(e){
                    var $this = $(this).parents('.jFileCropReszDiv'),
                        file = $this.data('file'),
                        queueId = file.queueId;
                    $J.jFile.queue[queueId].$_.jFdata().trgStatus.html('Imagen procesada por el usuario');
                    
                    jc_x1 = $this.find('.forInfo.x1').val();
                    jc_y1 = $this.find('.forInfo.y1').val();
                    jc_x2 = $this.find('.forInfo.x2').val();
                    jc_y2 = $this.find('.forInfo.y2').val();
                    sz_hg = $this.find('.modal-body img:eq(0)')[0].height;
                    sz_wd = $this.find('.modal-body img:eq(0)')[0].width;
                    
                    file.params = {x:jc_x1, y:jc_y1, x2:jc_x2, y2:jc_y2, h:sz_hg, w:sz_wd};
                    $J.jFile.queue[queueId]._procesable = true;
                    $J.jFile.initUpload();
                    $this.off().on('hidden.bs.modal', function(){ $(this).remove(); });
                    $this.modal('hide');
                    return;
                })

                if($().Jcrop)
                    $('#jFileCropReszDiv_'+opts.file.queueId).off().on('shown.bs.modal', function(){
                        var twidth = $('.modal .modal-dialog.modal-lg .modal-content .modal-body .row:eq(0) div:eq(0)').width(),
                            file = $(this).data('file');
                        var preimage = file.preimage;

                        var canvas = document.createElement('canvas');
                            canvas.width = twidth;
                            canvas.height = preimage.height*twidth/preimage.width;
                        var ctx = canvas.getContext("2d");
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(preimage, 0, 0, canvas.width, canvas.height);

                        $(this).find('.modal-body img').attr('src', canvas.toDataURL(file.type));
                        canvas = undefined;

                        if(typeof file.jcrop=='undefined')
                            $('#jFileCropReszDiv_'+opts.file.queueId+' .modal-body img:eq(0)').Jcrop($(this).jFdata().imgCropResz, function() {
                                $(this.ui.holder[0]).parents('.jFileCropReszDiv').data('file').jcrop = this;
                                var t = this.getBounds();
                                this.setSelect([0, 0, t[0], t[1]])
                            })
                        else
                            file.jcrop.setImage($(this).find('.modal-body img')[0]);
                    });
                else
                    console.log('jCrop es necesario .. https://github.com/tapmodo/Jcrop');

                $('#jFileCropReszDiv_'+opts.file.queueId).modal();
            });
        }

        $this.data('jF', $jF);

        $this.trigger('initialized.jys.jFile', {$_:$this, '$jF':$jF, 'options':options});

        $J.jFile.$_s.push($this);
    });
    
    return this;
}

$J.jFile.SPMoveScrolled = function(){
    $('.jFtrgFileStatus.SPMoveScrolled').each(function(){
        $of = $(this).data('jF').$_.offset();

        $of.top = $of.top*1;
        $of.top+=$(this).data('jF').$_.height()*1;
        $of.top+=$(this).data('jF').$_.css('margin-top').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('margin-bottom').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('padding-top').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('padding-bottom').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('border-top-width').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('border-bottom-width').replace('px', '')*1;
        $of.top-=$('body').scrollTop()*1;

        $of.left = $of.left*1;
        $of.left+=$(this).data('jF').$_.css('border-left-width').replace('px', '')*1;
        $of.left-=$('body').scrollLeft()*1;
        
        $(this).css({'top':$of.top, 'left':$of.left, 'right':'auto', 'bottom':'auto'})
    });
}

$(document).trigger("loaded.jys.jFile");
$(document).ready(function(e){
    $(".jFile").jFile();

    $('.jFtrgFileStatus.SPMoveScrolled').each(function(){
        $of = $(this).data('jF').$_.offset();

        $of.top = $of.top*1;
        $of.top+=$(this).data('jF').$_.height()*1;
        $of.top+=$(this).data('jF').$_.css('margin-top').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('margin-bottom').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('padding-top').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('padding-bottom').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('border-top-width').replace('px', '')*1;
        $of.top+=$(this).data('jF').$_.css('border-bottom-width').replace('px', '')*1;
        $of.top-=$('body').scrollTop()*1;

        $of.left = $of.left*1;
        $of.left+=$(this).data('jF').$_.css('border-left-width').replace('px', '')*1;
        $of.left-=$('body').scrollLeft()*1;
        
        $(this).css({'top':$of.top, 'left':$of.left, 'right':'auto', 'bottom':'auto'})
    });
});
$(document).scroll($J.jFile.SPMoveScrolled);
$(window).resize($J.jFile.SPMoveScrolled);

$(document)
  .on('drop', function(e){e.preventDefault();return false;})
  .on('dragenter', function(e){ $($J.jFile.$_s).each(function(index, element) { clearTimeout($(this).jFdata().doc_leave_timer); }); e.preventDefault();return false;})
  .on('dragover', function(e){ $($J.jFile.$_s).each(function(index, element) { clearTimeout($(this).jFdata().doc_leave_timer); }); e.preventDefault(); return false;})
  .on('dragleave', function(e){$($J.jFile.$_s).each(function(index, element){$(this).jFdata().doc_leave_timer = setTimeout((function(_this){return function(){  };})(this), 200);})});
