
	//
	// Global variables
	//
	
	// HTML DOM elements
	var mainView, localRenderingCheckBox, muteCheckBox, mediaRenderersListBox, mediaSourcesListBox, mediaSourceInfo, searchButton, searchField,
		deleteButton, createFolderButton, createUnder, renameButton, uploadFile, uploadTitle, uploadButton, uploadTo, folderTitle, itemTitle, speedButton, speedField, speedList,
		playButton, pauseButton, stopButton, volButton, volField, nextButton, previousButton, trackButton, trackField, seekButton, seekField, prefetchCheckBox,
		sortByPopList, sortDirectionPopList, folderPath, folderInfo, mediaContent, outLog;
	
	// DLNA global objects
	// Current media source
	var mediaSource;
	// Remote renderer (null if rendering locally)
	var remoteRenderer;
	// Browsing path from current DMS root folder
	var containerStack; 
	// Sort mode
	var sortMode;
	// Selected item
	var selectedItem;
	// Current operation: browse / search + folder
	var currentOp;
	//Continus playback implementation
	var currentList = [];
	var listplayStatus = "";
	var listCount = 1;
	var stopList = "";
	var trackNumber;
	//
	// Browser-supported media types 
	//
	
	var knownMediaTypes = {
		audio: [	
			"audio/ogg",
			"audio/x-vorbis",
			"audio/x-vorbis+ogg",
			"audio/mpeg",
			"audio/mp4",
			"audio/l16",
			"audio/x-ac3", 
			"audio/x-wav",
			"audio/x-ms-wma"
		],
		video: [
			"video/ogg",
			"video/x-oggm",
			"video/x-dirac", 
			"video/x-theora",
			"video/x-theora+ogg",
			"video/x-3ivx",
			"video/mpeg",
			"video/mp4",
			"video/webm",
			"video/avi",
			"video/flv",
			"video/x-ms-wmv",
			"video/x-ms-asf",
			"video/x-msvideo"
	 ]
	};


	function getSupportedMediaTypes() {
		var supported = [];
		var media=["audio","video"];
		for (var i=0; i<media.length; i++) {
			var tag = document.createElement(media[i]);
			for (var j=0; j<knownMediaTypes[media[i]].length; j++) {
				if (tag.canPlayType(knownMediaTypes[media[i]][j])) // accept "probably", "maybe"
					supported.push(knownMediaTypes[media[i]][j]);
			}
		}
		return supported;
	}
	
	
	//
	// Browser local implementation of MediaRenderer getProtocolInfo API
	//
	
	function getProtocolInfo() {
		var info = "http-get:*:image/jpeg:*,http-get:*:image/png:*,http-get:*:image/gif:*";
		var mediaTypes = getSupportedMediaTypes();
		for (var i=0; i<mediaTypes.length; i++) {
			info += ",http-get:*:" + mediaTypes[i] + ":*";
		}
		return info;
	}



	//
	// Initialization on HTML page load
	//
	
	function initPage() {
		// init HTML DOM elements
		log = document.getElementById("log");
		mainView = document.getElementById("mainView");
		localRenderingCheckBox = document.getElementById("localRenderingCheckBox");
		muteCheckBox = document.getElementById("muteCheckBox");
		mediaRenderersListBox = document.getElementById("mediaRenderersListBox");
		mediaSourcesListBox = document.getElementById("mediaSourcesListBox");
		mediaSourceInfo = document.getElementById("mediaSourceInfo");
		searchButton = document.getElementById("searchButton");
		searchField = document.getElementById("searchField");
		//OUT deleteButton = document.getElementById("deleteButton");
		//OUT createFolderButton = document.getElementById("createFolderButton");
		//OUT createUnder = document.getElementById("createUnder");
		//OUT renameButton = document.getElementById("renameButton");
		uploadFile = document.getElementById("uploadFile");
		uploadTitle = document.getElementById("uploadTitle");
		uploadButton = document.getElementById("uploadButton");
		uploadTo = document.getElementById("uploadTo");
		//OUT folderTitle = document.getElementById("folderTitle");
		//OUT itemTitle = document.getElementById("itemTitle");
		speedButton = document.getElementById("speedButton");
		speedField = document.getElementById("speedField");
		speedList = document.getElementById("speedList");
		playButton = document.getElementById("playButton");
		pauseButton = document.getElementById("pauseButton");
		stopButton = document.getElementById("stopButton");
		volButton = document.getElementById("volButton");
		volField = document.getElementById("volField");
		nextButton = document.getElementById("nextButton");
		previousButton = document.getElementById("previousButton");
		trackButton = document.getElementById("trackButton");
		trackField = document.getElementById("trackField");
		seekButton = document.getElementById("seekButton");
		seekField = document.getElementById("seekField");
		prefetchCheckBox = document.getElementById("prefetchCheckBox");
		sortByPopList = document.getElementById("sortByPopList");
		sortDirectionPopList = document.getElementById("sortDirectionPopList");
		folderPath = document.getElementById("folderPath");
		folderInfo = document.getElementById("folderInfo");
		mediaContent = document.getElementById("mediaContent");
		// prevent page scrolling
		mainView.style.height = Math.floor(0.8 * window.innerHeight) + "px";
		// init browsing context
		setSortMode();
		// init DLNA global objects
		containerStack = [];
		// in default DMP mode, only require browser-supported media types
		mediaserver.setProtocolInfo(getProtocolInfo());
		// Media Renderer manual init, scan network now
		mediarenderer.scanNetwork();
	}

	
	//
	// Dynamic HTML DOM elements creation
	//
	
	function containerBrowsingElement(source, container) {
		var node = document.createElement("input");
		node.type = "button";
		node.value = container.title;
		node.mediaSource = source;
		node.mediaContainer = container;
		return node;
	}
	
	function containerBrowsingListItem(source, container) {
		var node = containerBrowsingElement(source, container);
		node.className = "listContent button button-dark-blue";
		return node;
	}

	
	function mediaItemElement(item) {
		var node = document.createElement("div");
		node.className="content listContent";
		node.innerHTML = item.title;
		return node;
	}
	
	
	//
	// Media renderers management
	//

	function resetMediaRenderers() {
		mediaRenderersListBox.selectedIndex = -1;
		mediaRenderersListBoxChanged()
		mediarenderer.scanNetwork();		
	}
	
    function getMediaRendererById(id) {
		for (var i=0; i<mediaRenderersListBox.options.length; i++) {
			if (mediaRenderersListBox.options[i].value == id)
				return mediaRenderersListBox.options[i].mediaRenderer;
		}
    }

	function addMediaRenderer(renderer) {
		// Catch bogus media renderer / detected but introspection failed
		if (renderer.friendlyName == undefined)
			return;
		// check if the media renderer is already known
		if (getMediaRendererById(renderer.id))
			return;
		// add an option to the listbox
		var node = document.createElement("option");
		node.text = renderer.friendlyName;
		node.value = renderer.id;
		node.mediaRenderer = renderer;
		node.classname = "listboxRow opt";
		mediaRenderersListBox.add(node);
	}
	
	function removeMediaRendererById(rendererId) {
		// seek media renderer in the listbox
		for (var i=0; i<mediaRenderersListBox.options.length; i++) {
			if (mediaRenderersListBox.options[i].value == rendererId) {
				// remove media renderer from the listbox
				mediaRenderersListBox.remove(i);
				return;
			}
		}
	}

	function setRemoteRenderer(renderer) {
		if (remoteRenderer) {
			remoteRenderer.controller.onstatuschanged = null;
			remoteRenderer.controller.stop();
		}
		remoteRenderer = renderer;
		if (remoteRenderer) {
			speedButton.disabled = speedField.disabled = speedList.disabled = playButton.disabled = pauseButton.disabled = stopButton.disabled = volButton.disabled = volField.disabled = nextButton.disabled = previousButton.disabled = trackButton.disabled = trackField.disabled = seekButton.disabled = seekField.disabled = muteCheckBox.disabled = prefetchCheckBox.disabled = false;
			//while(speedList.options.length) 
				//speedList.options.remove(0);
			// set the renderer's controller onstatuschanged method
			remoteRenderer.controller.onstatuschanged = function() {
				listplayStatus = this.playbackStatus;
				if((this.playbackStatus=="stopped")&&(stopList=="play")&&(prefetchCheckBox.checked)){
					playlistManage();
				}
				log.innerHTML=this.playbackStatus;
				muteCheckBox.checked = this.muted;
				volField.value = this.volume;
				//trackField.value = this.track;
				//speedField.value = this.speed;
				//if (speedList.options.length != this.playSpeeds.length) {
					//while(speedList.options.length) 
						//speedList.options.remove(0);
					//for (var i=0; i<this.playSpeeds.length; i++) {
						//var node = document.createElement("option");
						//node.value = this.playSpeeds[i];
						//node.innerHTML = this.playSpeeds[i] + " X";
						//speedList.add(node);
					//}
				//}
			}
			// call it to initialize UI
			remoteRenderer.controller.onstatuschanged.apply(remoteRenderer.controller);
			mediaserver.setProtocolInfo(remoteRenderer.protocolInfo);
		}
		else {
			speedButton.disabled = speedField.disabled = speedList.disabled = playButton.disabled = pauseButton.disabled = stopButton.disabled = volButton.disabled = volField.disabled = nextButton.disabled = previousButton.disabled = trackButton.disabled = trackField.disabled = seekButton.disabled = seekField.disabled = muteCheckBox.disabled = prefetchCheckBox.disabled = true;
			mediaserver.setProtocolInfo(getProtocolInfo());
		}
		clearFolderInfo();
		if (containerStack.length > 0)
			browseContainerInStack(mediaSource, containerStack[containerStack.length-1].id);
	}
	
	function mediaRenderersListBoxChanged() {
		if (mediaRenderersListBox.selectedIndex==-1) {
			localRenderingCheckBox.checked = "checked";
			setRemoteRenderer(null);
		}
		else {
			localRenderingCheckBox.checked = false;
			setRemoteRenderer(mediaRenderersListBox.options[mediaRenderersListBox.selectedIndex].mediaRenderer);
		}
	}
	
	function localRenderingCheckBoxChanged() {
		if (localRenderingCheckBox.checked) {
			mediaRenderersListBox.selectedIndex = -1;
			setRemoteRenderer(null);
		}
		else
			mediaRenderersListBoxChanged();
	}
	
	function muteCheckBoxChanged() {
		remoteRenderer.controller.mute(muteCheckBox.checked);
	}
	
	function nextTrack() {
		//remoteRenderer.controller.next();
		//trackField.value = remoteRenderer.controller.track;
		remoteRenderer.controller.stop();
	}
	
	function previousTrack() {
		//remoteRenderer.controller.previous();
		//trackField.value = remoteRenderer.controller.track;
		listCount -= 2;
		remoteRenderer.controller.stop();
	}
	
	function stopRendButton(){
		stopList="";
		remoteRenderer.controller.stop();
	}

	
	//
	// Media sources management
	//

	function resetMediaSources() {
		mediaSourcesListBox.selectedIndex = -1;
		mediaSource = null;
		clearFolderBrowsing();
		mediaserver.scanNetwork();		
	}
	
    function getMediaSourceById(id) {
		for (var i=0; i<mediaSourcesListBox.options.length; i++) {
			if (mediaSourcesListBox.options[i].value == id)
				return mediaSourcesListBox.options[i].mediaSource;
		}
    }

	function addMediaSource(source) {
		// Catch bogus media source / detected but introspection failed
		if (source.friendlyName == undefined)
			return;
		// check if the media source is already known
		if (getMediaSourceById(source.id))
			return;
		// add an option to the listbox
		var node = document.createElement("option");
		node.text = source.friendlyName;
		node.value = source.id;
		node.mediaSource = source;
		mediaSourcesListBox.add(node);
	}
	
	function removeMediaSourceById(sourceId) {
		// seek media source in the listbox
		for (var i=0; i<mediaSourcesListBox.options.length; i++) {
			if (mediaSourcesListBox.options[i].value == sourceId) {
				// clear browsing area if the current media source is removed
				if (i == mediaSourcesListBox.selectedIndex)
					clearMediaSourceBrowsing();
				// remove media source from the listbox
				mediaSourcesListBox.remove(i);
				return;
			}
		}
	}

	
	//
	// Selected media source info
	//

	function logMediaSourceInfo(source) {
		mediaSourceInfo.innerHTML = "";
		if (source.iconURL)
			mediaSourceInfo.innerHTML += "<img width=32 height=32 src='" + source.iconURL + "' alt='" + source.friendlyName + "'>";
		mediaSourceInfo.innerHTML += "<b>" + source.friendlyName + "<b><br>";
		mediaSourceInfo.innerHTML += source.UPC + "<br>";
		if (source.serialNumber)
			mediaSourceInfo.innerHTML += "s/n: " + source.serialNumber + "<br>";
		if (source.manufacturerURL)
			mediaSourceInfo.innerHTML += "Manufacturer: " + "<a href='" + source.manufacturerURL + "'>" + source.manufacturerURL + "</a><br>";
		if (source.modelName)
			mediaSourceInfo.innerHTML += "Model: " + source.modelName + " (" + source.modelNumber + ")<br>"; 
		if (source.modelURL)
			mediaSourceInfo.innerHTML += "<a href='" + source.modelURL + "'>" + source.modelURL + "</a><br>";
		if (source.modelDescription)
			mediaSourceInfo.innerHTML += "Description: " + source.modelDescription + "<br>";
		if (source.presentationURL)
			mediaSourceInfo.innerHTML += "<a href='" + source.presentationURL + "'>" + source.presentationURL + "</a><br>";
		clearFolderBrowsing();
		if (source.root)
			browseMediaSourceContainer(source, source.root);
		mediaSource = source;
	}

	
	//
	// Media content view
	//

	function fitItemNodeInClientView(item, node, view) {
		// align largest item dimension on view, keep proportions 
		var ratio,xratio,yratio,width,height,match;
		match = item.resolution.match(/[0-9]+/g);
		width = match[0]; height = match[1];
		xratio = view.clientWidth / width;
		yratio = view.clientHeight / height;
		ratio = xratio < yratio ? xratio : yratio;
		node.width = width * ratio;
		node.height = height * ratio;
		return node;
	}
	
	function playlistManage(){
		listCount++;	
		var renderer = remoteRenderer;
		var rendererOpen = function(metaData) {
						renderer.openURI(currentList[listCount-1].content.uri,metaData).catch(debugLog);	
				}
		currentList[listCount].getMetaData().then(rendererOpen,function(){rendererOpen(null);});
		stopList="";
		trackField.value=listCount;
		setTimeout(function(){stopList = "play"},3500);	
		return;
	}
	
	function containerContentsItemOnClick() {
		clearContentArea();
		if (this.mediaContainer) {
			browseMediaSourceContainer(this.mediaSource, this.mediaContainer);
			return;
		}
		this.className = "content selectedContent listContent";
		selectedItem = this;
		listCount = this.trackNumber;
		trackField.value=listCount+1;
		if (remoteRenderer) {
			var renderer = remoteRenderer;
			var mediaItem = this.mediaItem;
			var rendererOpen = function(metaData) {
				if (prefetchCheckBox.checked) {
						setTimeout(function(){stopList = "play"},3500);
						}	
				else {
					setTimeout(function(){stopList = ""},3500);
					}
					renderer.openURI(mediaItem.content.uri, metaData).catch(debugLog);
				}
			
			mediaItem.getMetaData().then(rendererOpen,function(){rendererOpen(null);});
			return;
			
		}
		var node = null;
		if (this.mediaItem.type.indexOf("image") == 0) {
			node = document.createElement("img");
			node.src = this.mediaItem.content.uri;
			fitItemNodeInClientView(this.mediaItem, node, mediaContent);
		}
		else {
			if (this.mediaItem.type.indexOf("video") == 0) {
				node = document.createElement("video");
				fitItemNodeInClientView(this.mediaItem, node, mediaContent);
			}
			else if (this.mediaItem.type.indexOf("audio") == 0) {
				node = document.createElement("audio");
			}
			else 
				return;
			var source = document.createElement("source");
			source.src = this.mediaItem.content.uri;
			source.type = this.mediaItem.type;
			node.controls = true;
			node.autoplay = true;
			node.appendChild(source);
		}
		node.className = "content";
		mediaContent.appendChild(node);
	}
	
	
	//
	// Current browsing path management
	//

	function folderPathButtonOnClick() {
		browseContainerInStack(this.mediaSource, this.mediaContainer.id);
	}
	
	function pushContainerToFolderPath(source, container) {
		var node = containerBrowsingElement(source, container);
		node.className = "button button-dark-blue";
		node.onclick = folderPathButtonOnClick;
		folderPath.appendChild(node);	
	
	}
	
	function browseContainerInStack(source, containerId) {
		var i;
		var container = null;
		// clear all containers below the selected one
		for (i=0; i<containerStack.length; i++) {
			if (containerStack[i].id == containerId) {
				container = containerStack[i];
				containerStack.splice(i,containerStack.length-i);
			}
		}
		if (!container)
			return;
		folderPath.innerHTML="";
		for (i=0; i<containerStack.length; i++) {
			pushContainerToFolderPath(source, containerStack[i]);
		}
		browseMediaSourceContainer(source, container);
	}

	
	//
	// Container UI capacities
	//
    	
	function updateContainerCapacities() {
		if (containerStack.length == 0)
			return;
		var container = containerStack[containerStack.length-1];
		//OUT deleteButton.disabled = ! container.canDelete;
		//OUT renameButton.disabled = ! container.canRename;
		//OUT createFolderButton.disabled = ! (createUnder.selectedIndex == 0 || container.canCreateContainer);
		//OUT uploadButton.disabled = ! (uploadTo.selectedIndex == 0 || container.canUpload);
	}
	
	
	//
	// Delete content
	//
    
	
	function removeCurrentContent() {
		var msg, obj;
		if (selectedItem) {
			obj = selectedItem.mediaItem;
			msg = "Remove " + obj.type + " item \"" + obj.title + "\" ?";
		}
		else if (containerStack.length) {
			obj = containerStack[containerStack.length-1];
			msg = "Remove folder \"" + obj.title + "\" and all it's content ?"; 
		}
		else
			return;
		if (!confirm(msg))
			return;
		obj.remove().then(function() {
				clearFolderInfo();
				if (containerStack.length > 0)
					browseContainerInStack(mediaSource, containerStack[containerStack.length-1].id);
				alert("Removed item");
			}, 
			debugLog);
	}


	
	//
	// Rename content
	//
    
	
	function renameItem(newTitle) {
		if (selectedItem) {
			obj = selectedItem.mediaItem;
			obj.rename(newTitle).then(function() {
					selectedItem.innerHTML = obj.title = obj.proxy.DisplayName = newTitle;
				}, 
				debugLog);
		}
	}


	
	//
	// Create folder
	//

	
	function createFolder(title) {
		if (createUnder.selectedIndex == 0) {
			mediaSource.createFolder(title).then(function() {
				alert("Folder created by server");
			},
			debugLog);
			return;
		}
		if (containerStack.length == 0)
			return;
		var parent = containerStack[containerStack.length-1];
		parent.createFolder(title).then(function() {
			clearFolderInfo();
			if (containerStack.length > 0)
				browseContainerInStack(mediaSource, containerStack[containerStack.length-1].id);
			alert("Folder created under folder " + parent.title);
		},
		debugLog);
	}


	
	//
	// Uploads to a DMS
	//
    
	
	function uploadLocalContent() {
		if (uploadTo.selectedIndex == 0)
			uploadButton.source.upload(uploadTitle.value, uploadFile.value).then(function() {
				alert("File uploaded on server");
			},
			debugLog);
		else
			uploadButton.container.upload(uploadTitle.value, uploadFile.value).then(function() {
				clearFolderInfo();
				if (containerStack.length > 0)
					browseContainerInStack(mediaSource, containerStack[containerStack.length-1].id);
				alert("File uploaded under folder " + uploadButton.container.title);
			},
			debugLog);
	}

	
	
	//
	// Media source find under given container
	//

    
	function findInMediaSourceContainer(source, container, nameQuery) {
		var findCount = 40;
		var findOffset = 0;
		var searchQuery = nameQuery ? ("DisplayName contains \"" + nameQuery + "\"") : "*";
		var localOp = "Find_" + source.id + "_" + container.id + "_" + nameQuery;
		
		function findErrorCB(str) {
			alert("Error searching for " + nameQuery + " in " + container.title + " : " + str);
		}
		
	    function findContainerCB(mediaObjectArray) 
	    {
			// exit if we started browsing another container
			if (currentOp != localOp)
				return;
			for (var i=0; i<mediaObjectArray.length; i++) {
				var node = null;
				if (mediaObjectArray[i].type == "container") {
					node = containerBrowsingListItem(source, mediaObjectArray[i]);
				}
				else {
					node = mediaItemElement(mediaObjectArray[i]);
				}
				node.mediaItem = mediaObjectArray[i];
				node.onclick = containerContentsItemOnClick;
				outLog.appendChild(node);
			}
			if (mediaObjectArray.length == findCount) {
				findOffset += findCount;
				source.find(container.id, 
						searchQuery, /* search query */
						sortMode,  /* sortMode */
						findCount, 
						findOffset).then(findContainerCB, findErrorCB);
			}
			else // done
				currentOp = "";
	    }
		
		// exit if we are already doing the same thing
		if (currentOp == localOp)
			return;
		currentOp = localOp;
		clearFolderInfo();
		source.find(container.id, 
				searchQuery, /* search query */
				sortMode, /* sortMode */
				findCount, 
				findOffset).then(findContainerCB, findErrorCB);
	}


	//
	// Media source browsing by folder management
	//

    
	function browseMediaSourceContainer(source, container) {
		var browseCount = 40;
		var browseOffset = 0;
		var localOp = "Browse_" + source.id + "_" + container.id;
		
		function browseErrorCB(str) {
			alert("Error browsing " + container.title + " : " + str);
		}
		
	    function browseContainerCB(mediaObjectArray) 
	    {
			// exit if we are not browsing the current container
			if (currentOp != localOp)
				return;
			for (var i=0; i<mediaObjectArray.length; i++) {
				var node = null;
				trackNumber = i;
				if (mediaObjectArray[i].type == "container") {
					node = containerBrowsingListItem(source, mediaObjectArray[i]);
				}
				else {
					node = mediaItemElement(mediaObjectArray[i]);
				}
				currentList[i] = mediaObjectArray[i];
				node.trackNumber = trackNumber;
				node.mediaItem = mediaObjectArray[i];
				node.onclick = containerContentsItemOnClick;
				outLog.appendChild(node);
			}
			if (mediaObjectArray.length == browseCount) {
				browseOffset += browseCount;
				source.browse(container.id, 
						sortMode,  /* sortMode */
						browseCount, 
						browseOffset).then(browseContainerCB, browseErrorCB);
			}
			else // done
				currentOp = "";
	    }
		
		searchButton.source = uploadButton.source = source;
		searchButton.container = uploadButton.container = container;
		containerStack.push(container);
		pushContainerToFolderPath(source, container);
		updateContainerCapacities();
		// exit if we are already doing the same thing
		if (currentOp == localOp)
			return;
		currentOp = localOp;
		clearFolderInfo();
		source.browse(container.id, 
				sortMode, /* sortMode */
				browseCount, 
				browseOffset).then(browseContainerCB, browseErrorCB);
	}


	//
	// Content browsing sort mode
	//

	function setSortMode() {
		sortMode = {
				attributeName: sortByPopList.options[sortByPopList.selectedIndex].value,
				order: sortDirectionPopList.options[sortDirectionPopList.selectedIndex].value
		};
	}


	//
	// Clear content browsing areas
	//

	function clearContentArea() {
		mediaContent.innerHTML="";
		if (selectedItem)
			selectedItem.className = "content listContent";
		selectedItem=null;
	}
	    
	function clearFolderInfo() {
		outLog = document.createElement("div");
		outLog.style.width = (folderInfo.clientWidth - 4) + "px";
		outLog.style.maxWidth = folderInfo.clientWidth + "px";
		outLog.style.maxHeight = folderInfo.clientHeight + "px";
		outLog.style.overflow = "auto";
		folderInfo.innerHTML="<hr>";
		folderInfo.appendChild(outLog);
		clearContentArea();
	}

	    
	function clearFolderBrowsing() {
		containerStack = [];
		folderPath.innerHTML="";
		clearFolderInfo();
	}
	
	function clearMediaSourceBrowsing() {
		mediaSourceInfo.innerHTML="";
		clearFolderBrowsing();
	}
	
	//
	// Debug log function
	//

	function debugLog(msg) {
		alert(msg);
	}
	
	//
	// Cloudeebus manifest
	//

	var manifest = {
			name: "cloud-dLeyna",
			version: "development",
			key: "dLeyna",
			permissions: [
				"com.intel.dleyna-server",
				"com.intel.dleyna-renderer"
			]
	};
	
	//
	// Main Init function
	//

	function initRenderers() {
		mediarenderer._reset();
		mediarenderer.onrendererfound = function(e) {
			addMediaRenderer(e.renderer);
		};
		mediarenderer.onrendererlost = function(e) {
			removeMediaRendererById(e.id);
		};
		mediarenderer._bus = mediaserver._bus;
		mediarenderer._uri = mediaserver._uri;
		mediarenderer._manager = mediarenderer._bus.getObject(
				mediarenderer._busName, 
				"/com/intel/dLeynaRenderer", 
				initPage);
	}
	
	var init = function () {
		var cloudeebusHost = window.location.hostname;
		var cloudeebusPort = "9000";
		var queryString = window.location.toString().split("\?")[1];
		if (queryString) {
			var getVars = queryString.split("\&");
			for (var i=0; i<getVars.length; i++) {
				var varVal = getVars[i].split("\=");
				if (varVal.length == 2) {
					if (varVal[0] == "host")
						cloudeebusHost = varVal[1];
					else if (varVal[0] == "port")
						cloudeebusPort = varVal[1];
				}
			}
		}
		var cloudeebusURI = "ws://" + cloudeebusHost + ":" + cloudeebusPort;
		mediaserver.onserverfound = function(e) {
			addMediaSource(e.server);
		};
		mediaserver.onserverlost = function(e) {
			removeMediaSourceById(e.id);
		};
		mediaserver._init(cloudeebusURI, 
				manifest).then(
				initRenderers,
				debugLog);
	};
	
	// window.onload can work without <body onload="">
	window.onload = init;
