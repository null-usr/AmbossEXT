document.addEventListener('DOMContentLoaded', () => {

	chrome.storage.local.get(['highlight_colour'], (result) => {
		let default_colour = "#c4a9da";

		//comes back undefined if empty
		let colour =  result.highlight_colour;

		console.log('Value is currently ' + colour);

		if(colour){
			document.getElementById("html5colorpicker").value = colour;
		}
		else{
			document.getElementById("html5colorpicker").value = default_colour;
		}

	});

	document.querySelector('button').addEventListener('click', onClick, false);
	document.querySelector('input').addEventListener('input', changeColour);


	function onClick(){ 
		console.log("Popup's onClick is functioning");
		//query the tabs for the currently active tab
		chrome.tabs.query({currentWindow:true, active:true},
			(tabs) => {
				chrome.tabs.sendMessage(tabs[0].id, document.getElementById("html5colorpicker").value/*, {},
					(response) => {
						document.querySelector('button').disabled = true;
					}*/);
			})
	}

	function changeColour(){
		chrome.storage.local.set({highlight_colour: document.getElementById("html5colorpicker").value}, (result) => {
			console.log("Colour saved");
		});
	}
	
}, false);