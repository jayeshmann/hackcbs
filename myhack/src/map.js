import { Component } from 'react';
const atlas = require('azure-maps-control');
import { withAITracking } from '@microsoft/applicationinsights-react-js';
import 'azure-maps-control/dist/css/atlas.min.css';
import './map.css';
const PolygonDrawingTool = require('./PolygonDrawingTool.js').PolygonDrawingTool;

class Map extends Component {

    constructor(props) {
        super(props);
        this.state = {
            map: {},
            datasource: {},
            drawingTools: {},
            cameraPosition: [18.06918218638046, 59.326884478588596], //Default: Stockholm
            isPageLoaded: false,
            isDrawButtonDisabled: false,
            polygonCoordinates: '',
            isEditingPolygonData: false,
            undoManualChanges: [],
            defaultEditRows: 5
        };
    }

    componentDidMount() {
        this.loadMaps(this.props.coordinates);

        this.preventButtonAutoSubmit();
    }

    preventButtonAutoSubmit = () => {
        const buttons = document.querySelectorAll('button');
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].className.indexOf('azure-maps-control-button') > -1) {
                buttons[i].type = 'button'; //Prevent HTML5 auto-submit: https://www.w3.org/TR/2011/WD-html5-20110525/the-button-element.html#the-button-element
            }
        }
    }

    loadMaps(savedPolygon) {
        this.state.map = new atlas.Map('map-element', {
            center: this.state.cameraPosition,
            zoom: 12,
            maxZoom:20,
            language: 'en-US',

            //Get an Azure Maps key at https://azure.com/maps
            authOptions: {
                authType: 'subscriptionKey',
                subscriptionKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
            }
        });

        if (this.props.zoom === 'true') {
            const zoomControl = new atlas.control.ZoomControl();
            this.state.map.controls.add(zoomControl,
                {
                    position: "top-right" //bootstrap style problems when changing this value
                });
        }

        //Wait until the map resources are ready.
        this.state.map.events.add('ready', () => {
            this.state.datasource = new atlas.source.DataSource();
            this.state.map.sources.add(this.state.datasource);

            if (savedPolygon) {
                this.reRenderPolygon(savedPolygon);
            }

            this.state.drawingTools = new PolygonDrawingTool(this.state.map, null, (polygonShape) => {
                if (polygonShape) {
                    this.setState({ isDrawButtonDisabled: true });

                    const polygonJson = JSON.stringify(polygonShape.data.geometry.coordinates[0]);
                    const polygonArray = JSON.parse(polygonJson); //deep copy

                    this.setState({
                        polygonCoordinates: JSON.stringify(polygonArray)
                    });

                    for (let i = 0; i < polygonArray.length; i++) { //add order index, first in each array
                        polygonArray[i].unshift(i);
                    }

                    this.props.onPolygonChange(polygonArray); //bubble with order index
                }
            });

            if (this.state.polygonCoordinates !== '') {
                const editRowsNumber = JSON.parse(this.state.polygonCoordinates).length;
                if (editRowsNumber > 5 && editRowsNumber < 12) {
                    this.setState({ defaultEditRows: editRowsNumber });
                }
            }
        });

        const mapTimer = setInterval(() => {
            if (this.state.map.loaded) {
                this.setState({ isPageLoaded: this.state.map.loaded });
                clearTimeout(mapTimer);
            }
        }, 500);
    }

    reRenderPolygon(savedPolygon) {
        this.setCamera(savedPolygon);

        this.state.datasource.add(new atlas.data.Polygon(savedPolygon));

        const polygonLayer = new atlas.layer.PolygonLayer(this.state.datasource, 'reRenderedPolygonLayer', {
            fillColor: 'AQUA',
            opacity: 0.3
        });

        const lineLayer = new atlas.layer.LineLayer(this.state.datasource, 'reRenderedLineLayer', {
            color: 'AQUA',
            strokeWidth: 2
        });

        this.setState({
            polygonCoordinates: JSON.stringify(savedPolygon),
            isDrawButtonDisabled: this.state.datasource.shapes.length > 0
        });
        this.state.map.layers.add([polygonLayer, lineLayer]);

        for (let i = 0; i < savedPolygon.length; i++) { //add order index, first in each array
            savedPolygon[i].unshift(i);
        }
        this.props.onPolygonChange(savedPolygon);
    }

    startDrawing = () => {
        this.state.drawingTools.startDrawing();
    }

    clearDrawing = () => {
        this.state.datasource.clear();
        this.state.drawingTools.clear();

        this.setState({
            polygonCoordinates: '',
            isDrawButtonDisabled: this.state.datasource.shapes.length > 0
        });
    }

    getMyPosition = () => {
        /** NOT ABLE TO TEST DUE TO TELIA BLOCK */

        //if (navigator.geolocation) {
        //    const options = {
        //        enableHighAccuracy: true,
        //        timeout: 5000,
        //        maximumAge: 0
        //    };

        //    navigator.geolocation.getCurrentPosition((position) => {
        //        console.log(position);
        //TODO: PLACE CODE BELOW HERE AND USE position.coords.latitude/longitude IN bBox VARIABLE
        //    }, (error) => {
        //        console.warn(error);
        //    }, options);
        //}

        const point = [18.06918218638046, 59.326884478588596]; //Default: Stockholm
        this.state.map.setCamera({
            zoom: 12,
            center: point,
            duration: 1000,
            type: 'fly'
        });
    }

    setCamera = (polygon) => {
        const bBox = atlas.data.BoundingBox.fromLatLngs(polygon);

        this.state.map.setCameraBounds({
            bounds: bBox,
            //zoom: 24,
            padding:50,
            duration: 1000,
            type: 'fly'
        });
    }

    textEditPolygon(e) {
        this.state.datasource.clear();

        e.persist();
        if (e.key === 'Backspace') return;

        const newUndoValue = this.state.undoManualChanges.length === 0 ? e.target.defaultValue : e.target.value;
        this.state.undoManualChanges.push(newUndoValue);

        const newPolygon = JSON.parse(e.target.value);
        this.reRenderPolygon(newPolygon);
    }

    undoChanges() {
        if (this.state.undoManualChanges.length === 0) return;

        this.state.datasource.clear();
        const lastChange = this.state.undoManualChanges.pop();
        this.reRenderPolygon(JSON.parse(lastChange));

    }

    render() {
        return (
            <div>
                {this.props.draw === 'true' && this.state.isPageLoaded
                    && <div className="draw-buttons">
                        <button className="btn btn-sm btn-light btn-outline-secondary" disabled={this.state.isDrawButtonDisabled} type="button" onClick={this.startDrawing} title="Draw polygon"><i className="fa fa-pencil" /></button>
                        <button className="btn btn-sm btn-light btn-outline-secondary" type="button" onClick={this.clearDrawing} title="Clear map"><i className="fa fa-eraser" /></button>
                        <button className="btn btn-sm btn-light btn-outline-secondary text-danger" type="button" onClick={this.getMyPosition} title="My position"><i className="fa fa-location-arrow" /></button>
                    </div>}

                <div id="map-element"></div>

                <div className="form-group mb-2">
                    <span className="badge p-0 mr-2" htmlFor="polygon-data">Polygon data</span>
                    <button className="btn btn-sm btn-link text-warning pull-right" onClick={() => this.setState({ isEditingPolygonData: !this.state.isEditingPolygonData })} type="button"><i className="fa fa-edit mr-1" />Change manually...</button>
                    <div className="input-group">
                        <textarea name="polygon-data" type="text" className="form-control" disabled={!this.state.isEditingPolygonData} style={{ color: 'blue', fontFamily: 'consolas', fontSize: 'smaller' }} rows={this.state.defaultEditRows} value={this.state.polygonCoordinates} onChange={(e) => this.textEditPolygon(e)} />
                        <input className="btn btn-sm btn-light ml-2" type="button" onClick={(e) => this.undoChanges(e)} value="Undo" disabled={!this.state.isEditingPolygonData || this.state.undoManualChanges.length === 0} />
                    </div>
                </div>
            </div>
        );
    }
}

export default withAITracking(appInsights, Map);