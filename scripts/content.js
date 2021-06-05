// import { RU_to_SI_Parser } from 'parser';
const url = chrome.runtime.getURL('/data/lab_table.json');
let data = {};
let highlight_col = "";
let data_keys = [];

let decimal_re = /\d*\.?\d*/

//regular expression that takes 3 words before a span + the span contents
//let paragraph_re = /(?:\S+\s)?\S*text\S*(?:\s\S+)?/;
//let paragraph_re = /(?:\S+\s)?\S*(?:\S+\s)?\S*urine/;
//let paragraph_re = /(?:\S+\s)?\s*(?:\S+\s)?\s*(?:\S+\s)?\s*(<span\sclass="nowrap">.+?<\/span>)/;
let paragraph_re = /(?:\S+\s){1,3}is\s(<span\sclass="nowrap">.+?<\/span>)/gi;

//parser takes as parameter a data table, potential keys and an input of [amount][unit]
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
	output += " " + data_table[key][1];

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

	//do a check for our class first and if it's not there, then estimate units
	//otherwise just change colour on those classes
	let estimations = document.getElementsByClassName('unit-est');

	if(estimations.length === 0){
		EstimateTableUnits();
		EstimateParagraphUnits();
	}
	else{
		for(let i = 0, span; span = estimations[i]; i++){
			span.style['background-color'] = highlight_col;
		}
	}

	//https://stackoverflow.com/questions/55224629/what-caused-the-unchecked-runtime-lasterror-the-message-port-closed-before-a-r/62607033
	return true;
});

//get all the data in the table
function EstimateTableUnits(){
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

				row.cells[1].innerHTML = row.cells[1].innerHTML + "<span class=\"unit-est\" style= \"background-color:" + highlight_col + ";\"> ( ~"+ output + " )" + "</span>"
			}

		}
	}
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter
function paragraphReplacer(match, p1, p2, p3, offset, string){
	console.log("match: " + match);

	/*let process = match.replace("<span class=\"nowrap\">", '');
	process = process.replace('</span>', '');*/

	//get rid of all leftover inner html tags
	let process = match.replace(/<[^>]*>/ig, '');
	
	//theoretically everything in 0 refers to the serum and everything in 1 is the amount + unit which is usable by the parser
	process = process.split('is');
	let input = process[1];

	let keys = [];
	let test_values = process[0].split(' ');

	//determine potential keys
	data_keys.forEach( (key) =>{
		test_values.forEach( (test_value) =>{
			if(key.includes(test_value)){
				keys.push(test_value);
			}
		});
	});

	//reduce any duplicates
	keys = new Set(keys);
	keys = Array.from(keys);

	let output = RU_to_SI_Parser(data["data"], keys, input);

	if(output === ""){
		return match;
	}
	else{

		output = "<span class=\"unit-est\" style= \"background-color:" + highlight_col + ";\"> ( ~"+ output + " )" + "</span>";
		return match + output;
	}
}

function EstimateParagraphUnits(){
	//we know that all potentially useful units  are in a span chave the class "nowrap" 
	var tmp = document.getElementsByClassName('nowrap');
	tmp = Array.from(tmp);

	let paragraphs = new Set(tmp.map( span => span.parentElement ));
	paragraphs = Array.from(paragraphs);

	//we need to search each paragraph for instances of span with classes of 
	for(let index=0, paragraph; paragraph = paragraphs[index]; index++){
		let searchspace = paragraph.innerHTML;
		//console.log(searchspace);
		//searchspace = searchspace.split(' ');
		let result = searchspace.replace(paragraph_re, paragraphReplacer); 
		paragraph.innerHTML = result;
	}
}