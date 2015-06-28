/**
*   calendarWeekHour    Setup a week-hour grid:
*                           7 Rows (days), 24 Columns (hours)
*   @param id           div id tag starting with #
*   @param width        width of the grid in pixels
*   @param height       height of the grid in pixels
*   @param square       true/false if you want the height to
*                           match the (calculated first) width
*/
function leagueSchedule(id, width, height, square)
{
    var teamData = scheduleData(width, height, square);
    var grid = d3.select(id).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "chart");

    var row = grid.selectAll(".row")
        .data(teamData)
        .enter().append("svg:g")
        .attr("class", "row");

    grid.append("text")
        .attr("x", 800)
        .attr("y", 20)
        .style("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .text("Record (WLT)");

    var nextStartY = 50;
    for (var obj in teamData) {
        console.log(teamData[obj][0]);
        grid.append("text")
            .attr("x", 800)
            .attr("y", (nextStartY + ((30 + 2) * obj)))
            .style("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .text(teamData[obj][0].record);
    }

    grid.append("text")
        .attr("x", 20)
        .attr("y", 20)
        .style("text-anchor", "left")
        .attr("font-family", "sans-serif")
        .text("Team Names");

    for (var obj in teamData) {
        grid.append("text")
            .attr("x", 20)
            .attr("y", (nextStartY + ((30 + 2) * obj)))
            .style("text-anchor", "left")
            .attr("font-family", "sans-serif")
            .text(teamData[obj][0].team);
    }

    var col = row.selectAll(".cell")
        .data(function (d) { return d; })
        .enter().append("svg:rect")
        .attr("class", "cell")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("ry", 4)
        .attr("rx", 4)
        .attr("width", function(d) { return d.width; })
        .attr("height", function(d) { return d.height; })
        .on('mouseover', function() {
            d3.select(this)
                .style('fill', '#0F0');
         })
        .on('mouseout', function(d) {
            switch(d.value) {
                case 0:
                    d3.select(this)
                        .style('fill', '#d2b2b2');
                    break;
                case 1:
                    d3.select(this)
                        .style('fill', '#66c2a4');
                    break;
                case 2:
                    d3.select(this)
                        .style('fill', '#006d2c');
                    break;
                default:
                    d3.select(this)
                        .style('fill', 'gainsboro');
            }
         })
        .on('click', function() {
            console.log(d3.select(this));
         })
        .style("fill", function(d) {
            switch(d.value) {
                case 0:
                    return '#d2b2b2';
                    // #b2e2e2 was used before as a light-light green.
                case 1:
                    return '#66c2a4';
                case 2:
                    return '#006d2c';
                default:
                    return 'gainsboro';
            }
        });

    for (var team in teamData) {
        for (var result in teamData[team]) {
            grid.append("text")
                .attr("x", teamData[team][result].x + 15)
                .attr("y", teamData[team][result].y + 20)
                .attr("font-family", "sans-serif")
                .attr("font-size", "16px")
                .attr("fill", "white")
                .attr("text-anchor", "middle")
                .text( function() {
                    switch(teamData[team][result].value) {
                        case 0:
                            return 'L';
                        case 1:
                            return 'T';
                        case 2:
                            return 'W';
                        default:
                            return '';
                    }
                });
        }
    }

}

////////////////////////////////////////////////////////////////////////

/**
*   randomData()        returns an array: [
                                            [{id:value, ...}],
                                            [{id:value, ...}],
                                            [...],...,
                                            ];
                        ~ [
                            [hour1, hour2, hour3, ...],
                            [hour1, hour2, hour3, ...]
                          ]

*/
function scheduleData(gridWidth, gridHeight, square)
{
    var dataset = [
                    {name:"Seattle",    schedule:[2,0,0,2,1,1,2,2,2,3,3,3,3,3,3,3,3,3,3], record:"5-2-2"},
                    {name:"Washington", schedule:[0,2,2,0,1,2,0,2,1,3,2,3,3,3,3,3,3,3,3], record:"5-3-2"},
                    {name:"Chicago",    schedule:[2,1,2,2,1,2,1,0,3,3,3,3,3,3,3,3,3,3,3], record:"4-1-3"},
                    {name:"Houston",    schedule:[2,1,0,0,1,2,1,1,2,0,3,3,3,3,3,3,3,3,3], record:"3-3-4"},
                    {name:"Boston",     schedule:[0,2,0,0,2,1,2,1,0,3,3,3,3,3,3,3,3,3,3], record:"3-4-2"},
                    {name:"Kansas City",schedule:[0,0,2,2,2,1,0,0,1,3,3,3,3,3,3,3,3,3,3], record:"3-4-2"},
                    {name:"Portland",   schedule:[2,2,1,1,0,0,0,1,1,3,3,3,3,3,3,3,3,3,3], record:"2-3-4"},
                    {name:"WNY Flash",  schedule:[0,0,2,0,1,2,2,0,3,3,3,3,3,3,3,3,3,3,3], record:"3-4-1"},
                    {name:"Sky Blue",   schedule:[2,1,0,0,1,0,1,1,0,3,3,3,3,3,3,3,3,3,3], record:"1-4-4"}
                  ];

    var data = new Array();
    var gridItemWidth = 30;
    var gridItemHeight = 30;
    var startX = 90 + 30;
    var startY = 30;
    var stepX = gridItemWidth + 2;
    var stepY = gridItemHeight + 2;
    var xpos = startX;
    var ypos = startY;
    var newValue = 0;
    var count = 0;

    for (var index_a = 0; index_a < dataset.length; index_a++)
    {
        data.push(new Array());
        var row = dataset[index_a];
        for (var index_b = 0; index_b < row.schedule.length; index_b++)
        {
            newValue = row.schedule[index_b];
            teamName = row.name;
            teamRecord = row.record;
            data[index_a].push({
                                team: teamName,
                                record: teamRecord,
                                time: index_b,
                                value: newValue,
                                width: gridItemWidth,
                                height: gridItemHeight,
                                x: xpos,
                                y: ypos,
                                count: count
                            });
            xpos += stepX;
            count += 1;
        }
        xpos = startX;
        ypos += stepY;
    }
    return data;
}
