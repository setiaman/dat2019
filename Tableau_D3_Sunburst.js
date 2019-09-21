// Initialize the viz variable 
var vizSuperstore;

var	Tableau_Array_of_Objects;

/* ------------------------------ Tableau Section ------------------------------*/

window.onload= function() {
	
// When the webpage has loaded, load the viz.
	var Tableau_Sheet_Name = "Sales by Three Levels";

    var placeholder = document.getElementById('mySuperstoreViz');
    var vizURL = 'https://public.tableau.com/views/SampleDashboardSuperstore/DashboardSalesSummary';
    var options = {
    	width: '1px',	//Original '1050px'
    	height: '1px',	//Original '1000px'
    	hideToolbar: true,
    	hideTabs: true,
		
		
		onFirstInteractive: function () {
			// Function call to get tableau data after Tableau visualization is complete.
			Pass_Tableau_Data_to_D3(vizSuperstore, Tableau_Sheet_Name);
			
		}		
    };

	vizSuperstore = new tableau.Viz(placeholder, vizURL, options);
};


function Pass_Tableau_Data_to_D3(vizName, sheetName){
	sheet = vizName.getWorkbook().getActiveSheet().getWorksheets().get(sheetName);
	
	var Array_of_Columns;
	var Tableau_Array_of_Array;
			
	options = {
		maxRows: 0, // Max rows to return. Use 0 to return all rows
		ignoreAliases: false,
		ignoreSelection: true,
		includeAllColumns: false
	};

	// Get and reformat tableau data for D3 processing 
	sheet.getSummaryDataAsync(options).then(function(TableauData){
			Array_of_Columns = TableauData.getColumns();
			Tableau_Array_of_Array = TableauData.getData();
			//getfieldnames(Array_of_Columns);	// Debug output
			//console.log('***** Debug output getData() *****');	// Debug output
			//console.log(Tableau_Array_of_Array);			// Debug output
			
			/*Convert Tableau data into Array of Objects for D3 processing. */
			Tableau_Array_of_Objects = ReduceToObjectTablulated(Array_of_Columns, Tableau_Array_of_Array);
			//console.log('***** Display Tableau Array_Of_Objects *****');	// Debug output
			//console.log(Tableau_Array_of_Objects);			// Debug output

			var TableauTreeData = Convert_To_TreeData(Tableau_Array_of_Objects);
						
			//console.log('***** Display Tree Data *****');	// Debug output
			//console.log(TableauTreeData);			// Debug output

			//Generate D3 chart
			Draw_D3_Chart(TableauTreeData);
		
	});
}	


/*  getData() returns an array (rows) of arrays (columns) of objects, 
	which have a formattedValue property.
	Convert and flatten "Array of Arrays" to "Array of objects" in 
	field:values convention for easier data format for D3. */
function ReduceToObjectTablulated(cols, data){
	
	var Array_Of_Objects = [];
	
	for (var RowIndex = 0; RowIndex < data.length; RowIndex++) {
		var SingleObject = new Object();
		
		for (var FieldIndex = 0; FieldIndex < Object.keys(data[RowIndex]).length; FieldIndex++) {
			var FieldName = cols[FieldIndex].getFieldName();
			
			SingleObject[FieldName] = data[RowIndex][FieldIndex].formattedValue;
			delete SingleObject['SUM(Profit)'];

		} // Looping through the object number of properties (aka: Fields) in object
		
		Array_Of_Objects.push(SingleObject);	// Dynamically append object to the array
		

		//console.log('*****************');		// Debug output
		//console.log(SingleObject);			// Debug output
		//console.log(Array_Of_Objects);		// Debug output
		
	} //Looping through data array of objects.
	
	//console.log('***** Display Array_Of_Objects *****');	// Debug output
	//console.log(Array_Of_Objects);						// Debug output	
	return Array_Of_Objects;
}

function Convert_To_TreeData(FlatData){

	var TreeData = { name :"Customer Segment", children : [] };
	var levels = ["Customer Segment","Region"];	//Handling 3 levels of drill in a flat data.

	/*Convert tablulated data to tree data. */
	// For each data row, loop through the expected levels traversing the output tree
	FlatData.forEach(function(d){
		// Keep this as a reference to the current level
		var depthCursor = TreeData.children;
		// Go down one level at a time
		levels.forEach(function( property, depth ){

			// Look to see if a branch has already been created
			var index;
			depthCursor.forEach(function(child,i){
				if ( d[property] == child.name ) index = i;
			});
			// Add a branch if it isn't there
			if ( isNaN(index) ) {
				depthCursor.push({ name : d[property], children : []});
				index = depthCursor.length - 1;
			}
			// Now reference the new child array as we go deeper into the tree
			depthCursor = depthCursor[index].children;
			// This is a leaf, so add the last element to the specified branch

			var TempString = d["SUM(Sales)"].replace(",","");
			Target_Key = Math.round(+TempString); //Convert String to Numeric

			if ( depth === levels.length - 1 ) depthCursor.push({ name : d["Product Category"], size : Target_Key });
		});
	});
	
	return TreeData;
}





/* ------------------------------ Tableau Section ------------------------------*/

function Draw_D3_Chart(nodeData){
	
  // Define the dimensions of the visualization.
  var width = 600,		//960
      height = 580,		//700
      radius = (Math.min(width, height) / 2) - 10;

  var formatNumber = d3.format(",d");
  
  /* Define the scales that will translate data values
	 into visualization properties. The "x" scale
	 will represent angular position within the
	 visualization, so it ranges lnearly from 0 to
	 2π. The "y" scale will reprent area, so it
	 ranges from 0 to the full radius of the
	 visualization. Since area varies as the square
	 of the radius, this scale takes the square
	 root of the input domain before mapping to
	 the output range.  */
  var x = d3.scaleLinear()
      .range([0, 2 * Math.PI]);

  var y = d3.scaleSqrt()
      .range([0, radius]);

  var color = d3.scaleOrdinal(d3.schemeSet3);
  //var color = d3.scaleOrdinal()
  //  .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
  //var sequentialScaleColor = d3.scaleSequential(d3.interpolatePiYG);
  //var sequentialScaleColor = d3.scaleSequential()
  //  .domain([0, 2000000]);
  

  // Declare Data strucure
  var partition = d3.partition();

  // Size arcs
  var arc = d3.arc()
      .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
      .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
      .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
      .outerRadius(function(d) { return Math.max(0, y(d.y1)); });

  // Create the SVG container for the visualization and
  // define its dimensions. Within that container, add a
  // group element (`<g>`) that can be transformed via
  // a translation to account for the margins and to
  // center the visualization in the container.  	  
  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");
  
  // Find data root
  var root = d3.hierarchy(nodeData);
  root.sum(function(d) { return d.size; });
  
  svg.selectAll("path")
      .data(partition(root).descendants())
      .enter().append("path")
      .attr("d", arc)

      .style("fill", function(d) { return color((d.children ? d : d.parent).data.name); })
  //  .style("fill", function(d) { return color(d.data.name); })
  //  .style('fill', function(d) { return sequentialScaleColor(d); })
  //  .style('fill', function(d) { return sequentialScaleColor((d.children ? d : d.parent).data.name); })
	  
      .on("click", click)
    .append("title")
      .text(function(d) { return d.data.name + "\n" + formatNumber(d.value); });

  function click(d) {
    svg.transition()
        .duration(750)
        .tween("scale", function() {
          var xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
              yd = d3.interpolate(y.domain(), [d.y0, 1]),
              yr = d3.interpolate(y.range(), [d.y0 ? 20 : 0, radius]);
          return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
        })
      .selectAll("path")
        .attrTween("d", function(d) { return function() { return arc(d); }; });
  }

  d3.select(self.frameElement).style("height", height + "px");

}


/* Function to generate sub array based on target value string search. */
function SubArray(arrayInput, String_Key, String_Value){
	var ArraySub = [];
	for (var i = 0; i < arrayInput.length; i++)
	{
		if(arrayInput[i][String_Key] == String_Value) {
			ArraySub.push(arrayInput[i]);
		}
	}

	return ArraySub;
}



function Test_Console_Log(Array_Input) {
	console.log("*** Test Console ***");
	console.log(" ");
	console.log("*** Get Value of 1st Key ***");
	console.log(Array_Input[0]["Customer Segment"]);
	console.log("*** Get Value of 2nd Key ***");
	console.log(Array_Input[0]["Region"]);
	console.log(" ");

	console.log("*** Get first key/property name ***");
	console.log(Object.keys(Array_Input[0])[0]);
	console.log(" ");

	console.log("*** Get SUM(Sales) ***");
	console.log(Array_Input[0]["SUM(Sales)"]);

}

