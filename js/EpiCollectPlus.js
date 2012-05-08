var map;
var completed;
var succeeded;
var project;

var baseUrl = (location.href.indexOf("?") > 0 ? location.href.substr(0, location.href.indexOf("?")) :location.href );

EpiCollect = {};

EpiCollect.LoadingOverlay = function()
{
	var message = "Loading ...";
	var bdy = $(document.body);
	var size = Math.min(window.innerWidth, window.innerHeight) * 0.6;	
	var drawer = null;
	
	bdy.append("<div id=\"ecplus_loader_bg\" style=\"display:none\"><canvas id=\"ecplus_loader\"width=\""+size+"\" height=\""+size+"\">Loading...</canvas></div>");
	
	var ctx;
	var step = (2 * Math.PI) / 300;
	var i = 0;
	ctx = $("#ecplus_loader")[0].getContext('2d');
	ctx.translate(size/2, size/2);
	ctx.font = "18pt sans-serif";
	
	
	this.setMessage = function (msg)
	{
		message = msg;
	}
	
	this.start = function()
	{
		size = Math.min(window.innerWidth, window.innerHeight, 800) * 0.4;	
		
		$("#ecplus_loader").css({"width"  : size + "px", "height" : size + "px", "position" : "fixed", "top" : "50%", "left" : "50%", "margin-left" : "-" + (size/2) + "px", "margin-top" : "-" + (size/2) + "px", "border-radius" :"20px"});
		
		ctx = $("#ecplus_loader")[0].getContext('2d');
		
		
		$("#ecplus_loader_bg").show();
		drawer = setInterval(this.draw, 10);
	}
	
	this.draw = function()
	{
		var d = size;
		var halfd = d/2;
		ctx.clearRect(-halfd, -halfd, d, d);
		ctx.save();
		ctx.beginPath();
		
		var ts = ctx.measureText(message).width;
		ctx.fillText(message, -ts/2, 0);
		ctx.rotate(step * (++i % 300));
		
		ctx.lineWidth = 5;
		
		var tts = ts * 0.8;
		ctx.arc(0, 0, tts, 0, Math.PI * 0.5);
		ctx.stroke();
		
		ctx.beginPath()
		ctx.arc(0, 0, tts, Math.PI, Math.PI * 1.5);
		ctx.stroke();
		
		ctx.beginPath()
		ctx.strokeStyle = "rgba(255,255,255,1)";
		ctx.lineWidth = 10;
		ctx.arc(0, -10, tts, 0, Math.PI * 0.5);
		ctx.stroke();
		
		ctx.beginPath()
		ctx.lineWidth = 10;
		ctx.arc(0, 10, tts, Math.PI, Math.PI * 1.5);
		ctx.stroke();
		
		ctx.restore();
	}
	
	this.stop = function()
	{
		clearInterval(drawer);
		$("#ecplus_loader_bg").hide();
	}
	
}

String.prototype.pluralize = function(str)	
{
	if(str[str.length-1] != "s")
	{
		str += "s";
	}
	return str;
};

String.prototype.padLeft = function(length, char)	
{
	str = this
	while(str.length < length) { str = char + str; }
	return str;
};

String.prototype.padRight = function(length, char)	
{
	str = this
	while(str.length < length) { str = str + char; }
	return str;
};

String.prototype.trim = function(chars)
{
	// Extends the string class to incluide the trim method.
	str = this;
	for(char in chars)
	{
		if(chars[char] == this[0])
		{
			str = str.substr(1);
		}
		if(chars[char] == str[str.length -1])
		{
			str = str.substr(0, str.length - 1);
		}
			
	}
	return str.toString();
};

Date.prototype.format = function(fmt)
{
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	
	return fmt.replace("dd", this.getDate())
		.replace("MM" , months[this.getMonth()])
		.replace("yyyy", this.getFullYear())
		.replace("hh", this.getHours().toString().padLeft(2, "0"))
		.replace("mm", this.getMinutes().toString().padLeft(2, "0"))
		.replace("ss", this.getSeconds().toString().padLeft(2, "0"));
}

EpiCollect.onload = null;

// url should point to an XML doc
EpiCollect.loadProject = function(turl, callback)
{
	if(callback) EpiCollect.onload = callback;
	if(turl.match(/\.xml$/))
	{
		$.ajax({
			url : turl,
			success : EpiCollect.loadProjectCallback
		});
	}
	else
	{
		throw "Project must be loaded from an XML file";
	}
}

EpiCollect.loadProjectCallback = function(xhr)
{
	project = new EpiCollect.Project();
	project.parse(xhr);
	if(EpiCollect.onload) EpiCollect.onload(project);
}

function createHandler(obj, func)
{
	return (function(e, f){obj[func](e, f);})
}

EpiCollect.Project = function()
{
    this.forms = {};
    this.localUrl = '';
    this.remoteUrl = '';
    this.name = '';
    this.id = '';
    this.allowEdits = false;
    this.version = 0.0;
    this.map;
	this.description = "";
	
	this.getNextForm = function(name)
	{
		var n = Number(this.forms[name].num) + 1;
		var tbl = false;
		
		for(var t in this.forms)
		{
			if(this.forms[t].num == n)
			{
				tbl = this.forms[t];
				break;
			}
		}
		return tbl;
	}
	
	this.getPrevForm = function(tblName)
	{
		var n = Number(this.forms[tblName].num) - 1;
		var tbl = false;
		
		for(var t in this.forms)
		{
			if(this.forms[t].num == n)
			{
				tbl = this.forms[t];
				break;
			}
		}
		return tbl;
	}
	
	this.validateFormName = function(name)
	{
		if(this.forms[name]) return false;
		return !!name.match(/^[a-z0-9_\-]+$/gi);
	}
	
    this.parse = function(xml)
    {
		keys = {};
		
        mdl = xml.getElementsByTagName('model')[0];
        sub = mdl.getElementsByTagName('submission')[0];
        this.id = sub.getAttribute('id');
        this.name = sub.getAttribute('projectName');
		
        this.allowEdits = sub.getAttribute('allowDownloadEdits') == 'true';
        this.version = sub.getAttribute('versionNumber');
		
		var localServers = mdl.getElementsByTagName('uploadToLocalServer');
		if(localServers.length > 0){
			this.localUrl = localServers[0].firstChild.data;
		}
		if(mdl.getElementsByTagName('uploadToServer').length> 0) this.remoteUrl = mdl.getElementsByTagName('uploadToServer')[0].firstChild.data;
        
		var desc = xml.getElementsByTagName('description');
		if(desc && desc.length > 0)
		{
			this.description = desc[0].firstChild.data;
		}
		
        tbls = xml.getElementsByTagName('table');
		if (tbls.length == 0)
		{
			tbls = xml.getElementsByTagName('form');
		}
        for(var i = 0 ; i < tbls.length; i++){
            frm = new EpiCollect.Form();
            frm.parse(tbls[i]);

            this.forms[frm.name] = frm;
			keys[frm.key] = frm.name;
			if(this.getPrevForm(frm.name)){
				t = this.getPrevForm(frm.name);
				t.cols.push(frm.name + "Entries");
			}
        }
		for( tbl in this.forms )
		{
			var branches = this.forms[tbl].branchForms;
			for( var i = 0; i < branches.length; i ++ )
			{
				this.forms[branches[i]].branchOf = tbl;
			}
		}
	}
		
	this.draw = function(div)
	{
		for( tbl in this.forms )
		{
			$(div).append("<p>" + tbl + "</p>");
		}
	}
	
	this.toXML = function()
	{
		var xml = "<?xml version=\"1.0\"?><ecml><model><submission id=\"" + this.id + "\" projectName=\"" + this.name + "\" allowDownloadEdits=\"" + (this.allowEdits ? "true" : "false") +"\" version=\"" + this.version + "\" /></model>";
		for( form in this.forms )
		{
			xml = xml + this.forms[form].toXML();
		}
		xml = xml + "</ecml>";
		return xml;
	}
}

EpiCollect.Form = function()
{
	
	/**
	 * Project that this form is part of
	 * @author cpowell 
	 */
	this.project = false;
    this.fields = {};
    this.num = 0;
    this.name = '';
    this.key = '';
    this.titleField = '';
    this.cols = [];
	this.main = true;
	
	this.filterField = false;
	this.filterValue = false;
	this.searchValue = false;
	this.branchOf = false;
	this.branchForms = [];
	this.groupForms = [];
    this.store = {};

	this.hasMedia = false;
	this.gpsFlds = [];
	
	this.deletedBranches = [];
	
    this.parse = function(xml)
    {
        var tblData = xml.getElementsByTagName('table_data')[0];
		if(tblData){
			this.name = tblData.getAttribute('table_name');
			this.num = tblData.getAttribute('table_num');
			this.key = tblData.getAttribute('table_key');
		}
		else
		{
			this.name = xml.getAttribute('name');
			this.num = xml.getAttribute('num');
			this.key = xml.getAttribute('key');
			if(xml.getAttribute('main')) this.main = xml.getAttribute('main') === "true";
		}
        
		this.fld = new EpiCollect.Field();
		this.fld.id = "created";
		this.fld.form = this;
		this.fld.text = "Time Created";
		this.fields[this.fld.id] = this.fld;
		this.cols.push("created");
		
		this.fld = new EpiCollect.Field();
		this.fld.id = "uploaded";
		this.fld.form = this;
		this.fld.text = "Time Uploaded";
		this.fields[this.fld.id] = this.fld;
		this.cols.push("uploaded");
		
		this.fld = new EpiCollect.Field();
		this.fld.id = "lastEdited";
		this.fld.form = this;
		this.fld.text = "Last Updated";
		this.fields[this.fld.id] = this.fld;
		this.cols.push("lastEdited");
		
		this.fld = new EpiCollect.Field();
		this.fld.id = "DeviceID";
		this.fld.text = "Device ID";
		this.fld.form = this;
		this.fields[this.fld.id] = this.fld;
		this.cols.push("DeviceID");
		
		
		for(var nd = 0; nd < xml.childNodes.length; nd++)
		{
			if(xml.childNodes[nd].nodeType == 1 && xml.childNodes[nd].nodeName != "table_data")
			{
				field = new EpiCollect.Field();
				field.parse(xml.childNodes[nd]);
				field.form = this;
		
				this.fields[field.id] = field;
				this.cols.push(field.id);
				
				if(keys[field.id])
				{
					field.fkField = field.id;
					field.fkTable = keys[field.id];
				}
				if(field.title)this.titleField = field.id;
				if(field.type == "video" || field.type == "audio" || field.type == "photo")
				{
					this.hasMedia = true;
				}
				else if (field.type == "gps" || field.type == "location")
				{
					this.gpsFlds.push(field.id);
				}
				else if (field.type == "branch")
				{
					this.branchForms.push(field.connectedForm);
				}
				else if(field.type == "group")
				{
					this.groupForms.push(field.connectedForm);
				}

			}
		}
		
		this.fields[this.key].isKey = true;
		this.fields[this.key].required = true;
    }
		
	this.nextMkr = function()
	{
		this.currentMkr++;
		if(this.currentMkr >= this.mkrs.length) this.currentMkr = 0;
		return this.mkrs[this.currentMkr];
	};
		
	this.setGroupField = function(grpField)
	{
		try{
		this.currentMkr = -1;
		this.grps = {};
		this.groupField = grpField;
	
		for(var i in this.markers)
		{
			var mkr = "redCircle";
			var gVal = this.markerData[i][this.groupField];
			if(this.grps[gVal])
			{
					mkr = this.grps[gVal];
			}
			else
			{
					mkr = this.nextMkr();
					this.grps[gVal] = mkr;
			}
			this.markers[i].setIcon("../images/mapMarkers/" + (mkr ? mkr : "redCircle") + ".png");
		}
		this.drawMapLegend();
		}catch(err){alert(err);}
	}
	
	this.drawMapLegend = function()
	{
		
		if(!map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].length)
		{
			this.legend = document.createElement('div');
			this.legend.style.backgroundColor = '#EEEEEE';
			this.legend.style.padding = '5px 5px 5px 5px';
			this.legend.style.border = '1px solid #000000'
			var inner = document.createTextNode('Hello World');
			this.legend.appendChild(inner);
			map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(this.legend);
		}
		
		
		var i = 0;
		for(grp in this.grps)
		{
			var legRow = document.createElement('div');
			var img = document.createElement('img');
			img.style.display = 'inline';
			img.src = "../images/mapMarkers/" + this.grps[grp] + ".png";
			legRow.appendChild(img);
			legRow.appendChild(document.createTextNode(grp));
			if(i < this.legend.childNodes.length)
			{
				this.legend.replaceChild(legRow, this.legend.childNodes[i]);
			}
			else
			{
				this.legend.appendChild(legRow);
			}
			i++;
		}
		while(i < this.legend.childNodes.length) this.legend.removeChild(this.legend.childNodes[i]);
	}
	
	
	
	this.showAndFocus = function(key)
	{
		if(this.w) this.w.close();
		/*for(mkr in this.markers)
		{
			if(this.markers[mkr].proprietary_infowindow)this.markers[mkr].proprietary_infowindow.close();
		}*/
		if(!this.infoWindow) this.infoWindow = new google.maps.InfoWindow({});
		this.infoWindow.close();
		if(this.markers[key])
		{
			//this.markers[key].openBubble();
			this.infoWindow.setContent(this.markerData[key].infoBubble);
			this.infoWindow.setPosition(this.markers[key].getPosition());
			this.infoWindow.open(map);
			map.setCenter(this.markers[key].location)
			map.setZoom(10);
		}
		else
		{
			
			this.w = new Ext.Window({
				width: 215,
				title: 'Entry without position',
				html:this.descs[key],
				layout:{
					type: 'hbox',
					defaultMargins : {
						top : 5,
						left : 5,
						bottom : 5,
						right : 5
					},
					align:'center'								
				}
			});
			this.w.show();
		}
	}
	
	this.createMap = function(pnl, tab)
	{
		
		this.groupField = "DeviceID";
		this.grps = {};
		this.minT = Number.MAX_VALUE;
		this.maxT = -Number.MAX_VALUE;
		this.tPanel;
		this.mkrs = ["redCircle", "greenCircle", "greyCircle", "yellowCircle", "whiteCircle","plumCircle", "darkGreyCircle","maroonCircle", "navyCircle", "mintCircle",  "pinkCircle", "purpleCircle",
							   "redSquare", "greenSquare", "greySquare", "plumSquare", "darkGreySquare","maroonSquare", "navySquare", "mintSquare",  "pinkSquare", "purpleSquare"];
		this.currentMkr = -1;
		
		if(!tab.get('mapPnl')) return;
		
		Ext.get("ecMap").dom.style.display = "";
		Ext.get("ecMap").dom.style.width = tab.get('mapPnl').getWidth() + "px";
		Ext.get("ecMap").dom.style.height = (tab.get('mapPnl').getHeight() - 25) + "px";
		map = new google.maps.Map(document.getElementById('ecMap'), {
			center : new google.maps.LatLng(0,0),
			mapTypeId: google.maps.MapTypeId.HYBRID,
			zoom : 2,
			panControl: true,
			rotateControl: true,
			zoomControl: true
		});
		//map.setCenterAndZoom(new mxn.LatLonPoint(0,0), 2);
		//map.setMapType(mxn.Mapstraction.HYBRID);
		
		
		/*map.maps['googlev3'].setOptions({
			panControl: true,
			rotateControl: true,
			zoomControl: true
		});*/
		
		this.drawPoints();
	}
	
	this.removeAllMarkers = function()
	{
		for(var mkr in this.markers)
		{
			this.markers[mkr].setMap(null);
		}
		this.markers = {};
	};
	
	
	
	/**
	 * @author Chris I Powell
	 * 
	 * 
	 */
	
	
	
	/**
	 * @author Chris I Powell
	 * 
	 *  JQuery function to render the EpiCollect+ form
	 *  @param {String|HTMLElement|Null}  ele [Optional] An element or the id of an element which will contain the form, leaving out this param will generate a pop-up.
	 *  @param {Object} data [Optional] an object containing the entry data.
	 *  @param {Boolean} vertica [Optional] true to display the form in a line-by-line as opposed to one-at-a-time format
	 */
	this.displayForm = function(cnf)//(ele, data, vertical, index, editMode )
	{
		if(!cnf) cnf = {};
		var ele = cnf.element;
		var data = cnf.data;
		var vertical = cnf.vertical;
		var index = cnf.index;
		var editMode = cnf.edit;
		var debug  = cnf.debug;
		
		if(index == undefined)
			this.formIndex = 0;
		else
			this.formIndex = 1;
			
		if(data) data["updated"] = new Date().getTime().toString();
		
		var popup = false;
		if(typeof ele == "string" && ele[0] != "#" && ele[0] != ".")
		{
			ele  = "#" + ele; 
		}
		else if(typeof ele == "object")
		{
			ele = "#" + ele.id;
		}	
		else
		{
			$(document.body).append("<div id=\"ecplus-form-" + this.name + "\"></div>");
			ele = "#ecplus-form-" + this.name;
			popup = true;
		}
		
		this.formElement = $(ele);

		this.formElement
			.dialog("option", "title", "Add Location")
			.empty()
			.attr("title", (editMode ? "Edit " : "Add ") + this.name)
			.addClass(vertical ? "ecplus-vertical-form" :"ecplus-form")
			.removeClass(vertical ? "ecplus-form" :"ecplus-vertical-form")
			.append("<div class=\"ecplus-form-next\"><a href=\"#\" onclick=\"project.forms['"+ this.name +"'].moveNext();\">Next</a></div>")
			.append("<div class=\"ecplus-form-previous\"><a href=\"#\" onclick=\"project.forms['"+ this.name +"'].movePrevious();\">Previous</a></div>")
			.append("<div class=\"ecplus-form-pane\"><form name=\"" + this.name + "\"></form></div>");
				
		/*$(".ecplus-form-next a, .ecplus-form-previous a").mouseover(function(evt)
		{
			window.evt = evt;
			$(evt.target.parentElement).clearQueue();
			$(evt.target.parentElement).animate({width : 110});
		});
		
		$(".ecplus-form-next a, .ecplus-form-previous a").mouseout(function(evt)
		{
			$(evt.target.parentElement).clearQueue();
			$(evt.target.parentElement).animate({width : 26});
		});*/
		
		for(var field in this.fields)
		{
			if(this.fields[field].type == "" || this.fields[field].hidden)
			{
				$("form", this.formElement).append("<div class=\"ecplus-question-hidden\" id=\"ecplus-question-" + field + "\"><label>" + this.fields[field].text + "</label></div>");
				$("#ecplus-question-" + field, this.formElement).append(this.fields[field].getInput(data ? data[field] : undefined, cnf.debug));
			}
			else
			{
				$("form", this.formElement).append("<div class=\"ecplus-question\" id=\"ecplus-question-" + field + "\"><label>" + this.fields[field].text + "</label></div>");
				$("#ecplus-question-" + field, this.formElement).append(this.fields[field].getInput(data ? data[field] : undefined, cnf.debug));
				$("#ecplus-question-" + field, this.formElement).append("<div  id=\"" + field + "-messages\" class=\"ecplus-messages\"></div>");
			}
		}
		
		$("form", this.formElement).append("<div class=\"ecplus-question\" id=\"ecplus-save-button\"><label></label><br /></div>");
		if(cnf.debug)
		{
			$("#ecplus-save-button", this.formElement).append("<a href=\"javascript:project.forms['" + this.name +  "'].closeForm();\">End of Form</a>");
		}
		else if(editMode)
		{
			$("#ecplus-save-button", this.formElement).append("<a href=\"javascript:project.forms['" + this.name +  "'].editEntry();\">Save Entry</a>");
		}
		else
		{
			$("#ecplus-save-button", this.formElement).append("<a href=\"javascript:project.forms['" + this.name +  "'].addEntry();\">Save Entry</a>");
		}
		
		$(".ecplus-form-pane form", this.formElement).css("width", ($(".ecplus-question").width() * $(".ecplus-question").length + 1) + "px");
		
		if(popup)
		{
			var w = window.innerWidth ? window.innerWidth * 0.75 : 500;
			var h = window.innerHeight ? window.innerHeight * 0.75 : 400;
			this.formElement.dialog({
				width: w,
				height: h,
				modal : true,
				resizable : false,
				title : (data ? "Edit " : "Add ") + this.name,
				close : function(event, ui)
				{
					$(event.target).remove();
				}
			});
			$(".ecplus-question", this.formElement).width($(".ecplus-form-pane").width())
			$(".ecplus-form-pane form", this.formElement).css("width", ($(".ecplus-question", this.formElement).width() * $(".ecplus-question", this.formElement).length + 1) + "px");
		}
		
		$("input[type=date]", this.formElement).each(function(idx, ele) { 
			var fmt = project.forms[formName].fields[ele.name].date;
			if(project.forms[formName].fields[ele.name].setDate)
			{
				fmt = project.forms[formName].fields[ele.name].setDate;
			}
			fmt = fmt.replace("MM", "mm").replace("yyyy", "yy");
			
			$(ele).datepicker({ dateFormat : fmt });
		});
		if(this.gpsFlds.length > 0) $(".locationControl", this.formElement).gpsPicker()
		$(".ecplus-radio-group, .ecplus-check-group, select", this.formElement).controlgroup();
		$(".ecplus-media-input", this.formElement).mediainput();
		
		if(data)
		{
			for(var field in data)
			{
				$("#" + field, this.formElement).val(data[field]);
			}
		}
		
		$("select[childcontrol]", this.formElement).change(function(evt){
			var ctrl = $(evt.target);
			var child = $("#" + ctrl.attr("childcontrol"));
			
			$("option", child).hide();
			$("option[parentvalue=" + ctrl.val() + "]", child).show();
			
			// if this means the current value is hidden
			if($("option[value=" + child.val() + "]", child).css("display") == "none")
			{
				opts = $("option", child);
				
				for(var i = 0; i < opts.length; i++)
				{
					if($(opts[i]).css("display") != "none") child.val(opts[i].value);
				}
			}
		});
		
		$(".ecplus-input", this.formElement).blur(function(evt){
			if(!project.forms[formName].moveNext(true))
			{
				$(evt.target).focus();
			}
		});
		
		this.jumpFormTo(this.formIndex);
	};
	
	this.closeForm = function()
	{
		$(".ecplus-input", this.formElement).unbind("blur");
		this.formElement.dialog("close");
	};
	
	this.doJump = function(fieldName)
	{
		var start = this.formIndex;
		var done = false;

		var _frm = this;
		
		$(".ecplus-question").each(function(idx, ele){
			if(idx <= start || !_frm.fields[ele.id.replace("ecplus-question-", "")] ) return;
		
			if(fieldName && ele.id == "ecplus-question-" + fieldName)
			{
				done = true;
			}
			else if(fieldName && !done)
			{
				$(ele).hide();
			}
			else if(!_frm.fields[ele.id.replace("ecplus-question-", "")].jump)
			{
				$(ele).show();
			}
			else
			{
				$(ele).hide();
			}
		});
	}
	
	this.jumpFormTo = function(idx)
	{
		this.formIndex = idx;
		$(".ecplus-form-pane").scrollLeft(idx * $(".ecplus-question").width());
	}
	
	this.moveFormTo = function(idx)
	{
		if($(".ecplus-form").length == 0) return;
		
		if(window["interval"]) clearInterval(interval);
		if(idx < 0 || idx > $(".ecplus-question").length)
		{
			this.formIndex = 0;
			return;
		}
		this.formIndex = idx;
		
		step = $(".ecplus-question").width() / 15;
		
		interval = setInterval(function()
		{
			if(Math.abs($(".ecplus-form-pane").scrollLeft() - idx * $(".ecplus-question").width()) < step)
			{
				$(".ecplus-form-pane").scrollLeft(idx * $(".ecplus-question").width());
				clearInterval(interval);
			}
			
			if($(".ecplus-form-pane").scrollLeft() == idx * $(".ecplus-question").width())
			{
				clearInterval(interval);
			}
			else if($(".ecplus-form-pane").scrollLeft() < (idx * $(".ecplus-question").width()))
			{
				$(".ecplus-form-pane").scrollLeft($(".ecplus-form-pane").scrollLeft() + step);
			}
			else if($(".ecplus-form-pane").scrollLeft() > (idx * $(".ecplus-question").width()))
			{
				$(".ecplus-form-pane").scrollLeft($(".ecplus-form-pane").scrollLeft() - step);
			}
		}, 5)
		
	}
	
	this.moveNext = function(preventBlur)
	{
		try{
			if(this.formIndex == $('.ecplus-question').length - 1) return;
			//validate answer to previous question
			var fldName = $('.ecplus-question')[this.formIndex].id.replace("ecplus-question-", "");
			var val = $("#" + fldName, this.formElement).val();
			var valid = this.fields[fldName].validate(val);
			$("#" + fldName + "-messages").empty();
			
			if(!preventBlur)
			{
				$("#" + fldName, this.formElement)
					.unbind("blur")
					.blur()
					.blur(function(evt){
						project.forms[formName].moveNext(true);
					});
			}
			
	
			
			if(valid === true)
			{
				if(this.fields[fldName].jump)
				{
					var jumped = false; // is a jump required
					jbits = this.fields[fldName].jump.split(",");
													
					for(var j = 0; j < jbits.length; j+=2)
					{
						if(jbits[j+1] == $("#" + this.fields[fldName].id, this.formElement).idx() + 1)
						{
							this.doJump(jbits[j]);
							jumped = true;
						}
					}
					
					if(!jumped)
					{
						this.doJump(false);
					}
				}
				
				this.formIndex++;
				this.moveFormTo(this.formIndex);
				return true;
			}
			else	
			{
				for (msg in valid)
				{
					$("#" + fldName + "-messages").append("<p class=\"err\">" + valid[msg] + "<p>");
				}
				return  false;
			}
		}catch(err){alert(err);}
	}
	
	this.movePrevious = function()
	{
		this.formIndex--;
		this.moveFormTo(this.formIndex);
	}
		
	this.getValues = function()
	{
		vals = {};
		for(fld in this.fields)
		{
			vals[fld] = $("#" + fld).val();
		}
		return vals;
	}
	
	this.openBranch = function(branchName, rec)
	{
		var newEntry = !rec;
		if(newEntry)
		{
			var data = this.getValues();
			rec = {};
			rec[this.key] = data[this.key];
		}
		this.saveEntry();
		this.closeForm();
		project.forms[branchName].displayForm(undefined, rec, false);
		if(newEntry)
		{
			$("#" + this.key, project.forms[branchName].formElement).append('<option value="' + rec[this.key] + '" SELECTED>' + rec[this.key] + '</option>'  );
			$("#ecplus-question-" + this.key, project.forms[branchName].formElement).removeClass("ecplus-question").addClass("ecplus-question-hidden");
		}
	}
	
	this.closeForm = function()
	{
		if(this.branchOf == formName)
		{
			
			this.formElement.dialog("close");
			project.forms[formName].displayForm(undefined, project.forms[formName].getSavedEntry(), false, project.forms[formName].formIndex)
		}
		else
		{
			this.formElement.dialog("close");
		}
	}
	
	this.deleteEntry = function(key)
	{
		if(confirm("Are you sure you want to delete this entry?"))
		{
			$.ajax(baseUrl + "/" + key, {
				type : "DELETE",
				success:function()
				{
					getData();
				}
			});
		}
	}
	
	this.addEntry = function()
	{
		if(this.branchOf)
		{
			this.saveBranch();
			this.closeForm();
			return;
		}
		
		var frm = this;
		$.ajax(this.name, {
			type : "POST",
			data : this.getValues(),
			success:function(data, status, xhr)
			{
				
				var obj = JSON.parse(data);
				if(obj.success)
				{
					if(window["entryQueue"])
					{
						for(var qfrm in entryQueue)
						{
						
							var queue = entryQueue[qfrm];
							var len = queue.length;
							
							if(!window.branches) window.branches = 0;
							window.branches += len;
							
							for(var e = len; e--;)
							{
								$.ajax(qfrm, {
									type : "POST",
									data : queue[e],
									success : function(data, status, xhr){
										var obj = JSON.parse(data);
										
										if(!--window.branches)
										{
											$(frm.formElement).dialog("close");
											getData();
										}
									}
								});
							}
						}
					}
					else
					{
						$(frm.formElement).dialog("close");
						getData();
					}
					
				}
				else
				{
					alert(obj.msg);
				}
			},
			failure:function()
			{
				alert("Add request failed");
			}	
		});
	}
	
	this.saveEntry = function()
	{
		if(!localStorage) localStorage = {};
		localStorage[project.name + "_" + this.name] = JSON.stringify(this.getValues());
	}
	
	this.getSavedEntry = function()
	{
		var ent = localStorage[project.name + "_" + this.name];
		if(typeof ent == "string") ent = JSON.parse(ent);
		return ent;
	}
	
	this.saveBranch = function()
	{
		if(!window["entryQueue"]) entryQueue = {};
		if(!entryQueue[this.name]) entryQueue[this.name] = [];
		entryQueue[this.name].push(this.getValues());
		
		var ent = project.forms[formName].getSavedEntry();
		var flds = project.forms[formName].fields;
		
		for(f in  flds)
		{
			if(flds[f].connectedForm == this.name) {
				if(ent[f]){
					ent[f]++;
				}
				else
				{
					ent[f] = 1;
				}
			}
			localStorage[project.name + "_" + formName] = JSON.stringify(ent);
		}
	}
		
	this.editEntry = function()
	{
		if(this.branchOf)
		{
			this.saveBranch();
			this.closeForm();
			return;
		}
		
		vals = this.getValues();
		vals["lastEdited"] = new Date().getTime();
		
		var frm = this;
		
		$.ajax(baseUrl + "/" + vals[this.key], {
			type : "PUT",
			data : vals,
			success:function(data, status, xhr)
			{
				var obj = JSON.parse(data);
				if(obj.success)
				{
					$(frm.formElement).dialog("close");
					getData();
				}
				else
				{
					alert(obj.msg);
				}
			},
			failure:function()
			{
				alert("Edit request failed");
			}	
		});
	}
	
	this.toXML = function()
	{
		var xml = "<form name=\"" + this.name + "\" num=\"" + this.num + "\" key=\"" + this.key + "\" main=\"" + this.main + "\">";
		for(fld in this.fields){
			xml = xml + this.fields[fld].toXML();
		}
		xml = xml + "</form>";
		return xml;
	}
}

EpiCollect.Field = function()
{
	
    this.text = '';
    this.id = '';
    this.required = undefined;
    this.type = '';
    this.isinteger = false;
	this.isdouble = false;
    this.options = [];
    this.local = false;
    this.title = false;
    this.isKey = false;
	this.regex = null;
	this.verify = false;
	this.genkey = false;
	this.display = true;
	this.edit = true;
	
	this.date = null;
	this.time = null;
	this.setDate = null;
	this.setTime = null;
	
	this.min = null;
	this.max = null;
	this.defaultValue = null;
	
	this.match = false;
	this.crumb = false;
	
	this.hidden = false;
	this.search = false;
	
	/**
	 * form - the form that this field is part of
	 */
	this.form = false;
	/**
	 * connectedForm - the branch or group form that this field represents
	 */
	this.connectedForm = false;
	
	this.fkTable = false;
	this.fkField = false;
	
	this.jump = false;

    this.parse = function(xml)
    {
		this.type = xml.tagName;
		if(this.type == "gps") this.type = "location";
		this.id = xml.getAttribute('name');
		if(!this.id) this.id = xml.getAttribute('ref');
		this.title = Boolean(xml.getAttribute('title'));
		this.required = xml.getAttribute('required') == "true";
		this.isinteger = xml.getAttribute('integer') == "true";
		this.isdouble = xml.getAttribute('decimal') == "true";
		this.local = xml.getAttribute("local") == "true";
		this.regex = xml.getAttribute('regex');
		this.verify = xml.getAttribute('verify')=="true";
		this.genkey = xml.getAttribute('genkey') == "true";
		this.hidden = xml.getAttribute('display') == "false";
		this.search = xml.getAttribute('search') == "true";
		
		this.date = xml.getAttribute('date');
		this.time = xml.getAttribute('time');
		this.setDate = xml.getAttribute('setdate');
		this.setTime = xml.getAttribute('settime');
		
		this.edit = Boolean(xml.getAttribute('edit'));
		this.min = Number(xml.getAttribute('min'));
		this.max = Number(xml.getAttribute('max'));
		this.defaultValue = xml.getAttribute('default');
		
		this.jump = xml.getAttribute('jump');
		
		this.match = xml.getAttribute('match');
		this.crumb = xml.getAttribute('crumb');
		
		if(this.type == "branch")
		{
			this.connectedForm = xml.getAttribute("branch_form");
		}
		else if(this.type == "group")
		{
			this.connectedForm = xml.getAttribute("group_form");
		}
		else
		{
			for(t in this.form.forms)
			{
				if(survey.forms[t].key == this.id)
				{
					//FUTURE-PROOF : if we want to allow the foreign key field to have a differnt name to the primary key field
					this.fkParentTbl = survey.getPrevForm(survey.forms[t].name).name;
					this.fkParentField = survey.getPrevForm(survey.forms[t].name).key;
					this.fkChildTbl = survey.getNextTable(survey.forms[t].name).name;
					this.fkChildField = survey.getNextTable(survey.forms[t].name).key;
					
					this.fkTable = survey.forms[t].name;
					this.fkField = survey.forms[t].key;
				}
			}
		}
		
		this.text = xml.getElementsByTagName('label')[0].firstChild.data;
		var opts = xml.getElementsByTagName('item');
		for(var o = 0; o < opts.length; o++)
		{
			this.options.push({value : opts[o].getElementsByTagName('value')[0].firstChild.data, label : opts[o].getElementsByTagName('label')[0].firstChild.data});  
		}
		
		if(this.title) this.required = true;
    }

    
   this.getInput = function(val, debug)
   {
	   pre = "";
	   
	   if(!val)
	   {
		   if(this.id == "created" || this.id == "uploaded")
		   {
			   val = new Date().getTime().toString();
		   }
		   else if(this.id == "DeviceID")
		   {
			   val = "web";
		   }
		   else
		   {
			   val = "";
		   }
	   }
	   
	   if(!val && this.genkey) val = "web_" + new Date().getTime();
	   
	   if(this.crumb) pre = "<p>" + this.crumb + "</p>";
	   
	   //recursively check to see if this field is a key field from another form
	   //also need to make sure that 
	   var fkfrm;
	   var fkfld;
	   for(var frm = this.form; frm; frm = project.getPrevForm(frm.name))
	   {
		   if(frm.name == this.form.name) continue;
		   if(this.id == frm.key)
		   {
			   if(debug)
			   {
				   return pre + "<div>This is a key field from another form, when the form is being used a drop down list of keys from the previous form will appear here.</div>";
			   }
			   else
			   {
				   var pfield;
				   var pfrm = project.getPrevForm(frm.name);
				   if(pfrm && this.form.fields[pfrm.key])
				   {
					   pfield = pfrm.key;
				   }
				   else
				   {
					   pfield = false;
				   }
				   
				   this.required = true;
				   ctrl = "<select name=\""  + this.id + "\" id=\""  + this.id + "\"" + (fkfld ? " childcontrol=\"" + fkfld + "\"" : "") + " class=\"ecplus-input\" >";
				   //get options;
				   var cname = this.id;
				   var key = frm.key;
				   var title = frm.titleField;
				   
				   if(!this.callbacks) this.callbacks = {};
				   var cb = frm.name + new Date().getTime(); 
				   
				   window[cb] = function(data)
				   {
					  
					   for(var i = 0; i < data.length; i++)
					   {
						   $('#' + cname +'').append("<option value=\"" + data[i][key] +  "\" " + (pfield ? " parentvalue=\"" + data[i][pfield] + "\" " : "" ) + (val == data[i][key] ? " SELECTED" : "") + " >" +  data[i][title] + "</option>");
					   }
					   delete window[cb];
				   }
				   
				   $.getJSON("./" + frm.name + ".json", undefined, window[cb]);
				   ctrl += "</select>";
				   return pre + ctrl;
			   }
		   }
		   else
		   {
			   fkfrm = frm.name;
			   fkfld = frm.key;
		   }
	   }
		   
	   if(this.type == "branch")
	   {
		   return pre + "<div id=\"" + this.id + "\" class=\"ecplus-input\"><a href=\"javascript:project.forms['"+ this.form.name+"'].openBranch('" + this.connectedForm + "')\">Add Branch</a><p>This entry currently has <span>" +(val ? val : 0) +"</span> branch entries</p></div>";
	   }
	   else if(this.type == "select1")
	   {
		   ret =  "<select name=\"" + this.id + "\" id=\"" + this.id + "\" class=\"ecplus-input\" > ";
		   for(var i = 0; i < this.options.length; i++)
		   {
			   ret += "<option value=\"" + this.options[i].value + "\" " + (this.options[i].value == val ? "SELECTED" : "")  + ">" + this.options[i].label + "</option>";
		   }
		   ret +="</select>";
		   return pre +  ret;
	   }
	   else if(this.type == "select")
	   {
		   ret =  "";
		   for(var i = 0; i < this.options.length; i++)
		   {
			   ret = "<p id=\"" + this.id + "\"  class=\"ecplus-check-group ecplus-input\"><input type=\"checkbox\" name=\"" + this.name + "\" value=\"" + this.options[i].value + "\" " + (this.options[i].value == val ? "checked=\"checked\"" : "") + "><label>" + this.options[i].label + "</label></p>";
		   }
		   return pre + ret;
	   }
	   else if(this.type == "radio")
	   {
		   ret =  "<p id=\"" + this.id + "\" class=\"ecplus-radio-group ecplus-input\">";
		   for(var i = 0; i < this.options.length; i++)
		   {
			   ret += "<input type=\"radio\" name=\"" + this.id + "\" value=\"" + this.options[i].value + "\" " + (this.options[i].value == val ? "checked=\"checked\"" : "") + "><label>" + this.options[i].label + "</label><br />";
		   }
		   return pre + "</p>" + ret;
	   }
	   else if(this.type == "textarea")
	   {
		   return pre + "<textarea name=\"" + this.id + "\" id=\"" + this.id + "\" class=\"ecplus-input\">" + val + "</textarea>";
	   }
	   else if(this.date || this.setDate)
	   {
		   //Custom Date Picker
		   return pre + "<input type=\"date\" name=\"" + this.id + "\" value=\"" + val + "\" id=\"" + this.id + "\" class=\"ecplus-input\" />";
	   }
	   else if(this.time || this.setTime)
	   {
		   return pre + "<input type=\"time\" name=\"" + this.id + "\" value=\"" + val + "\" id=\"" + this.id + "\" class=\"ecplus-input\" />";
	   }
	   else if(this.type == "input" || this.type == "barcode")
	   {
		   return pre + "<input type=\"text\" name=\"" + this.id + "\" value=\"" + val + "\" id=\"" + this.id + "\" class=\"ecplus-input\" />";
	   }
	   else if(this.type == "video" || this.type == "audio" || this.type == "photo")
	   {
		   return pre + "<iframe id=\"" + this.id + "_iframe\" src=\"" + this.form.name + "/uploadMedia\" class=\"ecplus-input ecplus-media-input\" ></iframe><input type=\"hidden\" id=\"" + this.id + "\" name=\"" + this.id + "\" value=\"" + val + "\" />";
	   }
	   if(this.type == "location")
	   {
		   return pre + "<div id=\"" + this.id+ "\" class=\"locationControl ecplus-input\" ></div>";
	   }
	   else
	   {
		   return pre + "<input type=\"hidden\"id=\"" + this.id + "\" class=\"ecplus-input\" name=\"" + this.id + "\" value=\"" + val + "\" />";
	   }
   }
	
   this.populateControl = function(data)
   {
	   for(var i = 0; i < data.length; i++)
	   {
		   $('#' + this.id +'').append("<option value=\"" + data[i][this.id] +  "\" "   + " >" +  data[i][this.id] + "</option>");
	   }
	   
   }
   
	this.formatValue = function(value, data)
	{
		if(this.type == "photo"){
			if(value && !value.match(/null/i) && value != "-1")
			{
				return  "<a href=\"../ec/uploads/"+value+"\"><img src=\"../ec/uploads/"+value+"\" alt=\""+value+"\"/ height=\"125\"></a>";
			}
			else
			{
				return "<i>No Image</i>";
			}
		}else if(this.type == "video" || this.type == "audio"){
			if(value)
			{
				return "<a href=\"../ec/uploads/"+value+"\"> View Media </a>";
			}
			else
			{
				return "<i>No Media</i>";
			}
		}else if(this.type == "location" || this.type == "gps"){
			return value.latitude + ", " + value.longitude;
		}
		else if(this.id == 'created')
		{
			return new Date(value).toLocaleString();
		}
		else if(this.type == 'branch')
		{
			if(!value)
			{
				return '0';
			}
			else
			{
				return value + (data ?  ' <a href="' + this.connectedForm + '?' + this.form.key +  '=' + data[this.form.key] + '">View entries</a>' : '');
			}
		}
		else
		{ 
			if(!value || (typeof value == "string" && (value == "undefined" || value.match(/null/i))))
			{
				return '';
			}
			else
			{
				return value;
			}
		}
	}
	
	this.validate = function(value)
	{
		var msgs = []
		if(this.required && !value) msgs.push("This field is required");
		if(value && value != "")
	    {
			if(this.isinteger){
				if(!value.match(/^[0-9]+$/))
				{
					msgs.push("This field must be an Integer");
				}
			}
			if(this.isdouble){
				if(!value.match(/^[0-9]+(\.[0-9]+)?$/))
				{
					msgs.push("This field must be an decimal");
				}
			}
			
			if(this.date || this.setDate){
				// will consist of dd MM and yyyy
				var fmt = this.date + this.setDate; 
				var sep = null;
				
				var day = null;
				var month = null
				var year = null;
				
				for(var i = 0; i < fmt.length; i ++)
				{
					if(fmt[i] == "d")
					{
						if(fmt[i+1] == "d")
						{
							day = Number(value.substr(i,2));
							if(day == NaN) msgs.push("Day is not a number");
							i++
						}
						else
						{
							throw "Invalid date format";
						}
					}
					else if(fmt[i] == "M")
					{
						if(fmt[i+1] == "M")
						{
							month = Number(value.substr(i,2));
							if(month == NaN) msgs.push("Month is not a number");
							i++
						}
						else
						{
							throw "Invalid date format";
						}
					}
					else if(fmt[i] == "y")
					{
						if(fmt[i+1] == "y" && fmt[i+2] == "y" && fmt[i+3] == "y" )
						{
							year = Number(value.substr(i,4));
							if(year == NaN) msgs.push("Year is not a number");
							i+=3
						}
						else
						{
							throw "Invalid date format";
						}
					}
					else
					{
						if(!sep) sep = fmt[i];
					}
					
					if(day)
					{
						if(day < 1 || day > 31)	msgs.push("Day is out of range");
						else if(month && (month == 4 || month == 6 || month == 9 || month == 11) && day > 30) msgs.push("Day is out of range");
						else if(month && month == 2 && day > 29 && (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0))) msgs.push("Day is out of range");
						else if(month && month == 2 && day > 28) msgs.push("Day is out of range");
					}
					if(month)
					{
						if(month < 1 ||  month > 12) msgs.push("Month is out of range");
					}
					
				}
			}
			
			if(this.time || this.setTime){
				var fmt = this.date + this.setDate; 
				var sep = null;
				
				var hours = null;
				var minutes = null
				var seconds = null;
				
				for(var i = 0; i < fmt.length; i ++)
				{
					if(fmt[i] == "H")
					{
						if(fmt[i+1] == "H")
						{
							hours = Number(value.substr(i, 2));
							if(hours == NaN) msgs.push("Hours are not a number");
							if(hours < 0 || hours > 23) msgs.push("Hours out of range");
							i++;
							
						}
						else
							throw "Time Format is invalid";
							
					}
					else if(fmt[i] == "m")
					{
						if(fmt[i+1] == "m")
						{
							minutes == Number(value.substr(i,2));
							if(minutes == NaN) msgs.push("Minutes are not a number");
							if(minutes < 0 || minutes > 59) msgs.push("Minutes out of range");
							i++
						}
					}
					else if(fmt[i] == "s")
					{
						if(fmt[i+1] == "s")
						{
							seconds == Number(value.substr(i,2));
							if(seconds == NaN) msgs.push("Seconds are not a number");
							if(seconds < 0 || seconds > 59) msgs.push("Seconds out of range");
							i++
						}
					}
				}
			}
			
			if(this.regex){
				if(!value.match(new RegExp(this.regex))) msgs.push(this.regexMessage ? this.regexMessage : "The value you have entered is not in the right format.");
			}
			
			if(this.max){
				if(Number(Value) > this.max) msgs.push("Value must be less than  or equal to" + this.max);
			}
			
			if(this.min){
				if(Number(Value) < this.min) msgs.push("Value must be greater than or equal to " + this.min);
			}
			
			if(this.match){
				//in this version the match field must be present on the page and filled in
				info = this.match.split(",");
				
				matchStr = $("#" + info[1]).val().match(new RegExp(info[2]));
				valStr = value.match(new RegExp(info[2]));
				
				if(valStr != matchStr) msgs.push("The value does not match the string from the parent field");
			}
			
			if(this.verify)
			{
				if(!$("#" + this.id).hasClass("ecplus-valid"))
				{
					$("#" + this.id).hide();
					if(prompt("Please re-enter the value for " + this.text + " to confirm the value") != value)
					{
						msgs.push("field values must match");
						$("#" + this.id).val("");
					}
					$("#" + this.id).show();
				}
				
			}
	    }
		
		if(msgs.length == 0)
		{
			$("#" + this.id).removeClass("ecplus-invalid");
			$("#" + this.id).addClass("ecplus-valid");
		}
		else
		{
			$("#" + this.id).removeClass("ecplus-valid");
			$("#" + this.id).addClass("ecplus-invalid");
		}	
		
		return msgs.length == 0 ? true : msgs;		
	};
	
	this.toXML = function()
	{
		if(!this.type) return "";
		
		var xml = "<" + this.type + " ref=\"" + this.id + "\"";
		//TODO: Other settings
		if(this.required) xml = xml + " required=\"true\"";
		if(this.isinteger) xml = xml + " integer=\"true\"";
		if(this.isdouble) xml = xml + " decimal=\"true\"";
		if(this.local) xml = xml + " local=\"true\"";
		if(this.title) xml = xml + " title=\"true\"";
		if(this.regex) xml = xml + " regex=\"" + this.regex + "\"";
		if(this.verify) xml = xml + " verify=\"true\"";
		if(this.genkey) xml = xml + " genkey=\"true\"";
		if(!this.display || this.hidden) xml = xml + " hidden=\"true\"";
		if(this.edit) xml = xml + " edit=\"true\"";
		if(this.date && this.date != "") xml = xml + " date=\"" + this.date + "\"";
		if(this.time && this.time != "") xml = xml + " time=\"" + this.time + "\"";
		if(this.setDate && this.setDate != "") xml = xml + " setdate=\"" + this.setDate + "\"";
		if(this.setTime && this.setTime != "") xml = xml + " settime=\"" + this.setTime + "\"";
		if(this.min) xml = xml + " min=\"" + this.min + "\"";
		if(this.max) xml = xml + " max=\"" + this.max + "\"";
		if(this.defaultValue) xml = xml + " default=\"" + this.defaultValue + "\"";
		if(this.match) xml = xml + " match=\"" + this.match + "\"";
		if(this.crumb) xml = xml + " crumb=\"" + this.crumb + "\"";
		if(this.search) xml = xml + " search=\"true\"";
		if(this.jump) xml = xml + " jump=\"" + this.jump + "\"";
		if(this.type == "branch") xml = xml + " branch_form=\"" + this.connectedForm +"\"";
		
		xml = xml + "><label>" + this.text + "</label>"
		
		for(var i = 0; i < this.options.length; i++)
		{
			var opt = this.options[i];
			xml = xml + "<item><label>" + opt.label + "</label><value>" + opt.value + "</value></item>";
		}
		
		xml = xml + "</" + this.type + ">";
		return xml;
	}
	
}


