## Introduction

Map viewer using the Leaflet API

## Settings

- **initialCenter**: Decimal coordinates where map will be centered on load (e.g. `52, 5`). 
Leave this setting empty if you don't want to center the map at init. Remember to change the initial zoom level if you provide an initial location.

- **initialZoom**: Initial zoom level. From 1 to 18, where '1' represents the furthest level and '18' the maximum zoom level.

- **minzoom**: Minimun zoom allowed

- **iconName**: Name of the icon. Example: L.AwesomeMarkers.icon({icon: 'coffee', markerColor: 'red'}); [Leaflet.awesome-markers](https://github.com/lvoogdt/Leaflet.awesome-markers)

- **markerColor**: Color of the marker. Example: L.AwesomeMarkers.icon({icon: 'coffee', markerColor: 'red'}); [Leaflet.awesome-markers](https://github.com/lvoogdt/Leaflet.awesome-markers)

- **startPointMarkerLine**: Identical to the previous field 'Marker icon', except that here a marker can be defined for the startpoint of a line.
For example, the startpoint of a line can be set with a marker like a car-icon and the destination with a marker like a home-icon. 
If the field remains the same, no marker is set.

- **endPointMarkerLine**: Identical to the previous field 'Marker icon', except that here a marker can be defined for the endpoint of a line. 
For example, the endpoint of a line can be set with a marker like a car-icon and the destination with a marker like a home-icon. 
If the field remains the same, no marker is set.


## Wiring

### Input Endpoints

### Output Endpoints

## Usage

## Reference

- [FIWARE Mashup](https://mashup.lab.fiware.org/)
