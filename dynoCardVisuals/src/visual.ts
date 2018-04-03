




module powerbi.extensibility.visual {
    "use strict";
    export class Visual implements IVisual {
        private target: HTMLElement;

        private settings: VisualSettings;

        private flagCounter: number;


        private refoptions: VisualUpdateOptions;

        //-- declaration Block--------------
        private host: IVisualHost;
        private dynoCardSvg: d3.Selection<SVGAElement>;
        private surCrdSvgGrp: d3.Selection<SVGAElement>;
        private pumpCrdSvgGrp: d3.Selection<SVGAElement>;

        // axis
        private xAxisGroup: d3.Selection<SVGAElement>;
        private yAxisGroup: d3.Selection<SVGAElement>;
        private yAxisGroupPump: d3.Selection<SVGAElement>;
        private drawLineFunc: d3.svg.Line<DataPoint>;

        private xAxis_Position;
        private yAxis_Load;
        private svgCanvasHeight: number;



        private dataSet: ViewModel;
        private eventIdVal: any = 'all';
        private cardTypeVal: any = 'all';
        private eventIdDDList;
        private cardTypeDDList;
        private graphData: DataPoint[];
        private plotteSurfacedPath: any;
        private plottePumpPath: any;
        private isDropDownRender: boolean = false;
        private margin = { top: 100, right: 50, bottom: 80, left: 5 }

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.flagCounter = 0;
            this.target = options.element;

            if (typeof document !== "undefined") {
                this.target.appendChild(this.createInitialHeader());
                let animateButton = this.createButton();
                document.getElementById("buttonDiv").appendChild(animateButton);
                this.dynoCardSvg = d3.select(document.getElementById("dynoCardDiv")).append("svg").classed("dyno-svg-cls", true);

                // this.surCardSVG = d3.select(document.getElementById("surfaceCard")).append("svg").classed("sur-svg-cls", true);
                this.surCrdSvgGrp = this.dynoCardSvg.append("g").classed("sur-svg-grp-cls", true);
                this.surCrdSvgGrp.attr({ id: "surfaceCard" });
                // this.pumpCardSVG = d3.select(document.getElementById("pumpCardDiv")).append("svg").classed("pump-svg-cls", true);
                this.pumpCrdSvgGrp = this.dynoCardSvg.append("g").classed("pump-svg-grp-cls", true);
                this.pumpCrdSvgGrp.attr({ id: "pumpCard" });

                this.xAxisGroup = this.dynoCardSvg.append("g").classed("x-axis", true);
                this.yAxisGroup = this.dynoCardSvg.append("g").classed("y-axis", true);
                this.yAxisGroupPump = this.dynoCardSvg.append("g").classed("y-axis-pump", true);

            }
        }

        public update(options: VisualUpdateOptions) {
            this.dataSet = this.getTableData(options);

            if (!this.isDropDownRender) {
                let pumpDD = this.createDropDown(DataColumns.pumpId);
                let eventDD = this.createDropDown(DataColumns.eventId);
                let cardTypeDD = this.createDropDown(DataColumns.cardType);
                document.getElementById("controlDiv").appendChild(pumpDD);
                document.getElementById("controlDiv").appendChild(eventDD);
                document.getElementById("controlDiv").appendChild(cardTypeDD);
                this.isDropDownRender = true;
            }

            let svgCanvasWidth = options.viewport.width;
            this.svgCanvasHeight = options.viewport.height - this.margin.top - this.margin.bottom;
            this.dynoCardSvg.attr({
                width: svgCanvasWidth,
                height: this.svgCanvasHeight
            });

            //--- Define X & Y  Axis Scale and Line
            let xMax = d3.max(this.dataSet.dataPoints, d => d.position);
            this.xAxis_Position = d3.scale.linear().domain([0, xMax]).range([0, svgCanvasWidth]);
            this.yAxis_Load = d3.scale.linear().domain(d3.extent(this.dataSet.dataPoints, d => d.load)).range([this.svgCanvasHeight / 2, 0]);

            let xAxisLine = d3.svg.axis().scale(this.xAxis_Position).orient("bottom").tickSize(5).tickFormat(d => d + ' in');
            this.xAxisGroup.call(xAxisLine).attr({
                transform: "translate(" + this.margin.right + ", " + (this.svgCanvasHeight - 20) + ")"
            });

            let yAxisLine = d3.svg.axis().scale(this.yAxis_Load).orient("left").tickSize(5).tickFormat(d => Number(d) / 1000 + ' klb');
            this.yAxisGroup.call(yAxisLine).attr({
                transform: "translate(" + this.margin.right + ", 5)"
            }).style({
                'fill': "red",
                'stroke-width': "7px",
                width: "7px"
            });

            this.yAxisGroupPump.call(yAxisLine).attr({
                transform: "translate(" + this.margin.right + ", " + this.svgCanvasHeight / 2 + ")"
            });

            //-- Define Path Draw function
            this.drawLineFunc = d3.svg.line<DataPoint>().interpolate("cardinal")
                .x((dp: DataPoint) => { return this.xAxis_Position(dp.position); })
                .y((dp: DataPoint) => { return this.yAxis_Load(dp.load); });

            this.updateDynoCardGraph(options);
            this.refoptions = options;
        }

        private updateDynoCardGraph(options: VisualUpdateOptions) {
            // this.barGroup.attr("transform", "translate(0,5)");

            this.graphData = _.sortBy(this.graphData, 'cardId')
            let surfCardData = _.filter(this.graphData, { 'cardType': 'S' });
            let pumpCardData = _.filter(this.graphData, { 'cardType': 'P' });

            //surfCardData = _.sortBy(surfCardData, 'cardId');

            // const drawLine: d3.svg.Line<DataPoint> = d3.svg.line<DataPoint>().interpolate("cardinal")
            //     .x((dp: DataPoint) => { return this.xAxis_Position(dp.position); })
            //     .y((dp: DataPoint) => { return this.yAxis_Load(dp.load); });


            let plotSurfacePath = this.surCrdSvgGrp.selectAll("path").data([surfCardData]);
            plotSurfacePath.enter().append("path").classed("path-cls", true);
            plotSurfacePath.exit().remove();
            plotSurfacePath.attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .attr("d", this.drawLineFunc);

            this.plotteSurfacedPath = d3.select(document.getElementById("surfaceCard")).selectAll("path");
            let surfacePathLength = this.plotteSurfacedPath.node().getTotalLength();
            console.log("plotPathLenght Lenght", surfacePathLength);

            plotSurfacePath
                .attr("stroke-dasharray", surfacePathLength + " " + surfacePathLength)
                .attr("stroke-dashoffset", surfacePathLength)
                .transition()
                .duration(2000)
                .ease("linear")
                .attr("stroke-dashoffset", 0);



            let plotPumpPath = this.pumpCrdSvgGrp.selectAll("path").data([pumpCardData]);
            plotPumpPath.enter().append("path").classed("path-cls", true);
            plotPumpPath.exit().remove();
            plotPumpPath.attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .attr("d", this.drawLineFunc);


            this.plottePumpPath = d3.select(document.getElementById("pumpCard")).selectAll("path");
            let pumpPathLength = this.plottePumpPath.node().getTotalLength();
            console.log("pumpPathLength Lenght", pumpPathLength);

            plotPumpPath
                .attr("stroke-dasharray", pumpPathLength + " " + pumpPathLength)
                .attr("stroke-dashoffset", pumpPathLength)
                .transition()
                .duration(2000)
                .ease("linear")
                .attr("stroke-dashoffset", 0);
            this.surCrdSvgGrp.attr({
                transform: "translate(10,0)"
            });
            this.surCrdSvgGrp.attr({
                transform: "translate(" + this.margin.right + ",0)"
            });
            this.pumpCrdSvgGrp.attr({
                transform: "translate(" + this.margin.right + "," + (this.svgCanvasHeight / 2 - 30) + ")"
            })


            // let dotPump = this.pumpCrdSvgGrp.selectAll("circle").data(pumpCardData);
            // dotPump.enter().append("circle").attr({
            //     r: 2,
            //     cy: d => this.yAxis_Load(d.load),
            //     cx: d => this.xAxis_Position(d.position)
            // }).style({
            //     fill: 'blue'
            // });
            // dotPump.exit().remove();
            // dotPump.attr({
            //     r: 2,
            //     cy: d => this.yAxis_Load(d.load),
            //     cx: d => this.xAxis_Position(d.position)
            // }).style({
            //     fill: 'red'
            // })




        }

        private renderCard(cardId, dataSet){

        }
        private animateGraph() {

            let allDataPoints = _.sortBy(this.dataSet.dataPoints, 'cardId');

            let surfaceDataGrp = _.groupBy(_.filter(allDataPoints, { 'cardType': 'S' }), 'cardHeaderId');
            let pumpCardDataGrp = _.groupBy(_.filter(allDataPoints, { 'cardType': 'P' }), 'cardHeaderId');
            this.surCrdSvgGrp.selectAll("path").remove();
            let color=["red","green","blue","black", "yellow"];
            let count=0;
            let plotSurfacePath;
            for (let card in surfaceDataGrp) {
                let surCardData = surfaceDataGrp[card];
                console.log("Surface Card Data Point: ", surCardData);
                plotSurfacePath = this.surCrdSvgGrp.selectAll("path"+card).data([surCardData]);
                plotSurfacePath.enter().append("path").classed("path-cls", true);
                plotSurfacePath.exit().remove();
                plotSurfacePath.attr("stroke", color[count++])
                    .attr("stroke-width", 2)
                    .attr("fill", "none")
                    .attr("d", this.drawLineFunc);
                this.plotteSurfacedPath = d3.select(document.getElementById("surfaceCard")).selectAll("path");
                let surfacePathLength = this.plotteSurfacedPath.node().getTotalLength();

                plotSurfacePath
                    .attr("stroke-dasharray", surfacePathLength + " " + surfacePathLength)
                    .attr("stroke-dashoffset", surfacePathLength)
                    .transition()
                    .duration(2000)
                    .ease("linear")
                    .attr("stroke-dashoffset", 0);
            }










            //     let plotPumpPath = this.pumpCrdSvgGrp.selectAll("path").data([pumpCardData]);
            //     plotPumpPath.enter().append("path").classed("path-cls", true);
            //     plotPumpPath.exit().remove();
            //     plotPumpPath.attr("stroke", "steelblue")
            //         .attr("stroke-width", 2)
            //         .attr("fill", "none")
            //         .attr("d", drawLine);


            //     this.plottePumpPath = d3.select(document.getElementById("pumpCard")).selectAll("path");
            //     let pumpPathLength = this.plottePumpPath.node().getTotalLength();
            //     console.log("pumpPathLength Lenght", pumpPathLength);

            //     plotPumpPath
            //         .attr("stroke-dasharray", pumpPathLength + " " + pumpPathLength)
            //         .attr("stroke-dashoffset", pumpPathLength)
            //         .transition()
            //         .duration(2000)
            //         .ease("linear")
            //         .attr("stroke-dashoffset", 0);
            //     this.surCrdSvgGrp.attr({
            //         transform:"translate(10,0)"
            //     });
            //     this.surCrdSvgGrp.attr({
            //         transform:"translate("+this.margin.right+",0)"
            //     });
            //     this.pumpCrdSvgGrp.attr({
            //             transform:"translate("+this.margin.right+","+(this.svgCanvasHeight/2-30)+")"
            //         })

        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }


        public getTableData(options: VisualUpdateOptions): ViewModel {
            let sampleData: DataPoint[] = [];
            let retDataView: ViewModel = {
                dataPoints: sampleData,
                maxValue: d3.max(sampleData, d => d.load)
            }

            let dataView = options.dataViews[0].table.rows;
            let columnArr = options.dataViews[0].table.columns;
            let columnPos: any[] = [];
            for (let i = 0; i < columnArr.length; i++) {
                columnPos.push(String(Object.keys(columnArr[i].roles)[0]));
            }
            for (let i = 0; i < dataView.length; i++) {
                retDataView.dataPoints.push({
                    pumpId: <number>+dataView[i][columnPos.indexOf(DataColumns.pumpId)],
                    eventId: <number>+dataView[i][columnPos.indexOf(DataColumns.eventId)],
                    cardHeaderId: <number>dataView[i][columnPos.indexOf(DataColumns.cardHeaderId)],
                    cardType: <string>dataView[i][columnPos.indexOf(DataColumns.cardType)],
                    cardId: <number>dataView[i][columnPos.indexOf(DataColumns.cardId)],
                    position: <number>dataView[i][columnPos.indexOf(DataColumns.position)],
                    load: <number>+dataView[i][columnPos.indexOf(DataColumns.load)]
                });
            }
            console.log("Return Data:", retDataView);
            return retDataView;
        }



        public createInitialHeader() {
            const baseDiv: HTMLElement = document.createElement("div");
            baseDiv.setAttribute("class", "container-fluid");

            const reportTitle: HTMLElement = document.createElement("p");
            reportTitle.setAttribute("class", "text-center")
            reportTitle.appendChild(document.createTextNode(" Graph: Dyno Card"));
            baseDiv.appendChild(reportTitle);

            const controlDiv: HTMLElement = document.createElement("div");
            controlDiv.setAttribute("id", "controlDiv");
            controlDiv.setAttribute("class", "form-inline");
            baseDiv.appendChild(controlDiv);

            const dynoCardDiv: HTMLElement = document.createElement("div");
            dynoCardDiv.setAttribute("id", "dynoCardDiv");
            dynoCardDiv.setAttribute("class", "row");
            baseDiv.appendChild(dynoCardDiv);

            // const surfaceCardDiv: HTMLElement = document.createElement("div");
            // surfaceCardDiv.setAttribute("id", "surfaceCard");
            // surfaceCardDiv.setAttribute("class", "row");
            // baseDiv.appendChild(surfaceCardDiv);

            // baseDiv.appendChild(document.createElement("hr"));

            // const pumpCardDiv: HTMLElement = document.createElement("div");
            // pumpCardDiv.setAttribute("id", "pumpCardDiv");
            // pumpCardDiv.setAttribute("class", "row");
            // baseDiv.appendChild(pumpCardDiv);

            baseDiv.appendChild(document.createElement("hr"));
            const buttonDiv: HTMLElement = document.createElement("div");
            buttonDiv.setAttribute("id", "buttonDiv");
            buttonDiv.setAttribute("class", "row");
            baseDiv.appendChild(buttonDiv);

            return baseDiv;
        }

        public createDropDown(argDropDownType: string) {
            let ddDiv = document.createElement("div");
            let ddLabel: HTMLElement;
            ddDiv.setAttribute("class", "col-xs-4 input-group");
            let labelDiv = document.createElement("div");
            labelDiv.setAttribute("class", "input-group-addon");
            let dropDown = document.createElement("select");
            dropDown.setAttribute("class", "form-control");
            dropDown.setAttribute("id", argDropDownType);
            let dropDownData = [];

            if (argDropDownType == DataColumns.pumpId) {
                labelDiv.appendChild(document.createTextNode("Pump ID"))
                let pumpIdList = _.uniq(_.map(this.dataSet.dataPoints, 'pumpId'));
                dropDownData = _.map(pumpIdList, item => String(item))
            } else if (argDropDownType == DataColumns.cardType) {
                labelDiv.appendChild(document.createTextNode("Card Type"))
                dropDownData = _.uniq(_.map(this.dataSet.dataPoints, 'cardType'));
                this.cardTypeDDList = dropDownData;
            } else if (argDropDownType == DataColumns.eventId) {
                labelDiv.appendChild(document.createTextNode("Event ID"))
                dropDownData = _.uniq(_.map(this.dataSet.dataPoints, 'eventId'));
                this.eventIdDDList = dropDownData;
            }

            //Create and append the options
            let allOp = document.createElement("option");
            allOp.text = "All";
            allOp.value = "all";
            dropDown.appendChild(allOp);
            for (let i = 0; i < dropDownData.length; i++) {
                let option = document.createElement("option");
                option.value = dropDownData[i];
                option.text = dropDownData[i];
                dropDown.appendChild(option);
            }
            dropDown.onchange = (event: Event) => {
                let selVal = $("#" + argDropDownType).val();
                console.log("Event for: ", argDropDownType, ' value: ', selVal);
                if (argDropDownType == DataColumns.eventId) this.eventIdVal = selVal;
                else if (argDropDownType == DataColumns.cardType) this.cardTypeVal = selVal;
                this.updateGraphData();
                this.updateDynoCardGraph(this.refoptions);
                console.log("Current Graph Data:", this.graphData);
            }

            ddDiv.appendChild(labelDiv);
            ddDiv.appendChild(dropDown);
            return ddDiv;
        }

        public updateGraphData() {
            if (this.eventIdVal == 'all' && this.cardTypeVal == 'all') this.graphData = this.dataSet.dataPoints;
            else if (this.eventIdVal != 'all' && this.cardTypeVal == 'all') this.graphData = _.filter(this.dataSet.dataPoints, { 'eventId': +this.eventIdVal });
            else if (this.eventIdVal == 'all' && this.cardTypeVal != 'all') this.graphData = _.filter(this.dataSet.dataPoints, { 'cardType': this.cardTypeVal });
            else if (this.eventIdVal != 'all' && this.cardTypeVal != 'all') {
                let graphDataFilterByEventId = _.filter(this.dataSet.dataPoints, { 'eventId': +this.eventIdVal });
                this.graphData = _.filter(graphDataFilterByEventId, { 'cardType': this.cardTypeVal });
            }

        }

        public createButton() {
            let tempButton = document.createElement("button");
            let clickCount = 0;
            let thisRef = this;
            tempButton.setAttribute("type", "button");
            tempButton.setAttribute("class", "btn btn-success center-block");
            tempButton.textContent = "Run DynoCard Animation";
            tempButton.onclick = function () {
                thisRef.animateGraph();
            }
            return tempButton;
        }

    }

    export class DataColumns {
        static pumpId = "PumpId";
        static eventId = "EventId";
        static cardHeaderId = "CardHeaderID";
        static cardType = "CardType";
        static cardId = "CardId";
        static position = "Postition";
        static load = "Load";
    }
    export interface DataPoint {
        pumpId: number;
        eventId: number;
        cardHeaderId: number;
        cardType: string;
        cardId: number;
        position: number;
        load: number;
    };

    export interface ViewModel {
        dataPoints: DataPoint[];
        maxValue: number;
    }
}