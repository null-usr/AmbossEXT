var colour = "#c4a9da";

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector('button').addEventListener('click', onClick, false);
	//document.querySelector('input').addEventListener('oninput', changeColour, false);


	function onClick(){ 
		console.log("Popup's onClick is functioning");
		//query the tabs for the currently active tab
		chrome.tabs.query({currentWindow:true, active:true},
			(tabs) => {
				chrome.tabs.sendMessage(tabs[0].id, document.getElementById("html5colorpicker").value, {},
					(response) => {
						document.querySelector('button').disabled = true;
					});
			})
	}

	// function changeColour(){
	// 	colour = document.getElementById("html5colorpicker").value;
	// }
	
}, false);