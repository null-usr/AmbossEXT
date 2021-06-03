// import { RU_to_SI_Parser } from 'parser';
const url = chrome.runtime.getURL('/data/lab_table.json');
let data = {};
let highlight_col = "";
let data_keys = [];
let decimal_re = /\d*\.?\d*/

function RU_to_SI_Parser(data_table, keys, input){
	let key = "";
	let output = "";

	//console.log("Input: " + input);

	//if we have multiple keys, find the one whose units match what we're looking for
	for( let i = 0, testkey; testkey = keys[i]; i++ ){
		if(input.includes(data_table[testkey][0])){
			key = testkey;
			break;
		}
	}

	//we didn't find matching units, just leave it
	if(key === ""){
		return "";
	}

	//remove the unit from the data and parse out the numbers
	let p1 = input.replace(data_table[key][0], '');

	//dealing with a data range
	if(p1.includes('-')){
		let p2 = p1.split('-');
		let n1 = p2[0].match(decimal_re);
		let n2 = p2[1].match(decimal_re);

		n1 = n1 * data_table[key][2];
		n2 = n2 * data_table[key][2];

		//if the factor isn't a power of 10, only 2 decimal places
		let is10 = Number.isInteger(Math.log10(data_table[key][2]));
		if(!is10){
			n1 = parseFloat(n1.toFixed(2));
			n2 = parseFloat(n2.toFixed(2));
		}

		output = n1 + "-" +  n2;
	} // otherwise just a single number value
	else{
		let n1 = p1.match(decimal_re);
		n1 = n1 * data_table[key][2];

		//if the factor isn't a power of 10, only 2 decimal places
		let is10 = Number.isInteger(Math.log10(data_table[key][2]));
		if(!is10){
			n1 = parseFloat(n1.toFixed(2));
		}
		
		output = n1;
	}

	//add new unit afterwards
	output += data_table[key][1];

	return output;
}

fetch(url)
	.then( (response) => response.json() )
	.then( (json) => {
		data = json;
		data_keys = Object.keys(data["data"]);
		//console.log("json file loaded.");
});

//once our button is clicked, estimate table units
chrome.runtime.onMessage.addListener( (req, sender, opts, res) => {
	highlight_col = req;
	EstimateUnits();


	//https://stackoverflow.com/questions/55224629/what-caused-the-unchecked-runtime-lasterror-the-message-port-closed-before-a-r/62607033
	return true;
});

//get all the data in the table
function EstimateUnits(){
	const tables = document.querySelectorAll('table');

	//for each table...
	for(let index=0; index < tables.length; index++){
		//make sure the table doesn't have lab-values in it
		if (tables[index].id.includes("lab-values")){
			continue;
		}

		//iterate over every row in the table
		for( let i = 0, row; row = tables[index].rows[i]; i++ ){
			let category = "";

			//handling those one-value rows
			if(row.cells.length === 1){
				category = row.cells[0];
				continue;
			}

			//get a sample of the values here
			if(row.cells.length === 2 && row.cells[1].innerText !== ""){

				let matches = []

				data_keys.forEach((key, index) => {
					if(key.includes(row.cells[0].innerText)){
						matches.push(key);
					}
				});

				//no changes to be made, carry on
				if(matches.length === 0){
					continue;
				}

				let output = RU_to_SI_Parser(data["data"], matches, row.cells[1].innerText);

				//if our output is empty for whever reason, continue
				if(output === ""){
					continue;
				}

				//console.log(output);

				row.cells[1].innerHTML = "<span style= \"background-color:" + highlight_col + ";\">"+ output + "</span>" + " ( " + row.cells[1].innerHTML + " )"
			}

		}
	}
}