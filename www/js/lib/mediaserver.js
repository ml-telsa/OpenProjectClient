/******************************************************************************
 * Copyright 2012 Intel Corporation.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *****************************************************************************/



/*****************************************************************************/

var mediaserver = window.mediaserver = {};

mediaserver._reset = function() {
	mediaserver._busName = "com.intel.dleyna-server";
	mediaserver._bus = null;
	mediaserver._uri = null;
	mediaserver._manager = null;
};


mediaserver._init = function(uri, manifest) {
	mediaserver._reset();
		
	var promise = new cloudeebus.Promise(function (resolver) {
		
		function onManagerOk(proxy) {
			// Use LAN addresses in case there is a remote renderer
			proxy.PreferLocalAddresses(false);
			// Register mediaserver._manager proxy for found / lost servers
			proxy.connectToSignal("com.intel.dLeynaServer.Manager", "FoundServer",
					mediaserver._foundServerId, onerror);
			proxy.connectToSignal("com.intel.dLeynaServer.Manager", "LostServer",
					mediaserver._lostServerId, onerror);
			// promise fulfilled
			resolver.fulfill();
		}
		
		function onConnectOk() {
			mediaserver._bus = cloudeebus.SessionBus();
			mediaserver._uri = uri;
			mediaserver._manager = mediaserver._bus.getObject(mediaserver._busName, "/com/intel/dLeynaServer", onManagerOk, onerror);
		}
		
		function onerror(error) {
			cloudeebus.log("MediaServer init error: " + error);
			resolver.reject(error, true);			
		}
		
		cloudeebus.connect(uri, manifest, onConnectOk, onerror);
	});
	
	// First network scan for media servers once initialization done
	return promise.then(mediaserver.scanNetwork, onerror);
};


mediaserver._serverProxyIntrospected = function(proxy) {
	if (mediaserver.onserverfound)
		mediaserver.onserverfound.call(mediaserver, {
				type: "serverfound",
				server: new mediaserver.MediaServer(proxy)
			});
}


mediaserver._foundServerId = function(id) {
	var proxy = mediaserver._bus.getObject(mediaserver._busName, id);
	// <appeasement - UPnP & DLNA certification tools>
	var countCallDone = function() {
			mediaserver._bus.getObject(mediaserver._busName, id, mediaserver._serverProxyIntrospected);
		};
	proxy.callMethod("org.freedesktop.DBus.Properties", "Get", ["org.gnome.UPnP.MediaObject2", "ChildCount"]).then(
	  countCallDone, countCallDone);
	// </appeasement>
}


mediaserver._lostServerId = function(id) {
	if (mediaserver.onserverlost)
		mediaserver.onserverlost.call(mediaserver, {
				type: "serverlost",
				id: id
			});
}


mediaserver.scanNetwork = function() {
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			mediaserver._foundServerId(ids[i]);
	}
	
	function onerror(error) {
		cloudeebus.log("MediaServer scanNetwork error: " + error);
	}
	
	mediaserver._manager.GetServers().then(onObjIdsOk, onerror);
	mediaserver._manager.Rescan();
};


mediaserver.setProtocolInfo = function(protocolInfo) {
	return mediaserver._manager.SetProtocolInfo(protocolInfo);
}



/*****************************************************************************/

mediaserver.MediaServer = function(proxy) {
	this.proxy = proxy;
	if (proxy) {
		this.id = proxy.objectPath;
		this.friendlyName = proxy.FriendlyName;
		this.manufacturer = proxy.Manufacturer;
		this.manufacturerURL = proxy.ManufacturerUrl;
		this.modelDescription = proxy.ModelDescription;
		this.modelName = proxy.ModelName;
		this.modelNumber = proxy.ModelNumber;
		this.modelURL = proxy.ModelURL;
		this.serialNumber = proxy.SerialNumber;
		this.UPC = proxy.UDN;
		this.presentationURL = proxy.PresentationURL;
		this.iconURL = proxy.IconURL;
		// proxy has a root folder if it implements MediaContainer2
		if (proxy.ChildCount) {
			this.root = new mediacontent.MediaContainer(proxy);
			if (!this.root.title)
			  this.root.title = this.friendlyName;
		}
	}
	return this;
};


mediaserver.browseFilter = [
	"Path",
	"Type",
	"DisplayName",
	"URLs",
	"MIMEType",
	"Date",
	"Size",
	"Width",
	"Height",
	"Duration",
	"Bitrate",
	"Album",
	"Artist",
	"Genre"
];

mediaserver._containerGetPropertiesDeferred = function(container) {
	var obj = container;
	obj.proxy.callMethod("org.freedesktop.DBus.Properties", "Get",
		[
			"org.gnome.UPnP.MediaContainer2", 
			"ChildCount"
		]).then(
		function (ChildCount) {
			obj.childCount = ChildCount;
		});
	obj.proxy.callMethod("org.freedesktop.DBus.Properties", "Get",
		[
			"org.gnome.UPnP.MediaObject2", 
			"DLNAManaged"
		]).then(
		function (DLNAManaged) {
			if (DLNAManaged.CreateContainer)
				obj.canCreateContainer = true;
			if (DLNAManaged.Delete)
				obj.canDelete = true;
			if (DLNAManaged.Upload)
				obj.canUpload = true;
			if (DLNAManaged.ChangeMeta)
				obj.canRename = true;
		});
}

mediaserver._mediaObjectsOkCallback = function(jsonArray, resolver) {
	var objArray = [];
	for (var i=0; i<jsonArray.length; i++) {
		var obj = mediacontent.mediaObjectForProps(jsonArray[i]);
		obj.proxy = mediaserver._bus.getObject(mediaserver._busName, obj.id);
		if (obj.type == "container") 
			mediaserver._containerGetPropertiesDeferred(obj);
		objArray.push(obj);
	}
	resolver.fulfill(objArray);
};


mediaserver.MediaServer.prototype.browse = function(id, sortMode, count, offset) {

  var promise = new cloudeebus.Promise(function (resolver) {
	var sortStr = "";
	if (sortMode) {
		if (sortMode.order == "ASC")
			sortStr = "+";
		else
			sortStr = "-";
		sortStr += sortMode.attributeName;
	}

	function onMediaObjectsOk(jsonArray) {
		resultArray = resultArray.concat(jsonArray);
		if (count) { // user wanted a partial result set, try to build it
			if (resultArray.length >= count || jsonArray.length == 0 ||
					(containerProxy.ChildCount && offset + resultArray.length >= containerProxy.ChildCount))
				mediaserver._mediaObjectsOkCallback(resultArray, resolver);
			else {
				localOffset += jsonArray.length;
				localCount -= jsonArray.length;
				browseContainerProxy();
			}
		}
		else { // user wanted everything, iterate until there's no result left
			if (jsonArray.length == 0 ||
					(containerProxy.ChildCount && offset + resultArray.length >= containerProxy.ChildCount))
				mediaserver._mediaObjectsOkCallback(resultArray, resolver);
			else {
				localOffset += jsonArray.length;
				browseContainerProxy();
			}
		}
	}

	function onerror(error) {
		cloudeebus.log("MediaServer browse error: " + error);
		resolver.reject(error, true);			
	}
	
	function browseContainerProxy() {
		containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "ListChildrenEx", 
		[
			localOffset, 
			localCount, 
			mediaserver.browseFilter, 
			sortStr
		]).then(
		onMediaObjectsOk,
		onerror);
	}

	var resultArray = [];
	var localCount = count ? count : 0;
	var localOffset = offset ? offset : 0;
	var containerProxy = mediaserver._bus.getObject(mediaserver._busName, id);
	containerProxy.callMethod("org.freedesktop.DBus.Properties", "Get",
		[
			"org.gnome.UPnP.MediaContainer2", 
			"ChildCount"
		]).then(
		function (ChildCount) {
			containerProxy.ChildCount = ChildCount;
			browseContainerProxy();
		},
		onerror);		
  });
  
  return promise;
};


mediaserver.MediaServer.prototype.find = function(id, query, sortMode, count, offset) {

  var promise = new cloudeebus.Promise(function (resolver) {
	var sortStr = "";
	if (sortMode) {
		if (sortMode.order == "ASC")
			sortStr = "+";
		else
			sortStr = "-";
		sortStr += sortMode.attributeName;
	}

	function onMediaObjectsOk(jsonArray, total) {
		resultArray = resultArray.concat(jsonArray);
		if (count) { // user wanted a partial result set, try to build it
			if (resultArray.length >= count || jsonArray.length == 0 ||
					(total && offset + resultArray.length >= total))
				mediaserver._mediaObjectsOkCallback(resultArray, resolver);
			else {
				localOffset += jsonArray.length;
				localCount -= jsonArray.length;
				searchContainerProxy();
			}
		}
		else { // user wanted everything, iterate until there's no result left
			if (jsonArray.length == 0 || (total && offset + resultArray.length >= total))
				mediaserver._mediaObjectsOkCallback(resultArray, resolver);
			else {
				localOffset += jsonArray.length;
				searchContainerProxy();
			}
		}
	}

	function onerror(error) {
		cloudeebus.log("MediaServer search error: " + error);
		resolver.reject(error, true);			
	}
	
	function searchContainerProxy() {
		containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "SearchObjectsEx", 
		[
			query ? query : "*",
			localOffset, 
			localCount, 
			mediaserver.browseFilter, 
			sortStr
		]).then(
		onMediaObjectsOk,
		onerror);
	}

	var resultArray = [];
	var localCount = count ? count : 0;
	var localOffset = offset ? offset : 0;
	var containerProxy = mediaserver._bus.getObject(mediaserver._busName, id);
	searchContainerProxy();
  });
  
  return promise;
};


mediaserver.MediaServer.prototype.upload = function(title, path) {
	return this.proxy.UploadToAnyContainer(title, path);
};


mediaserver.MediaServer.prototype.createFolder = function(title) {
	return this.proxy.CreateContainerInAnyContainer(title, "container", ["*"]);
};


