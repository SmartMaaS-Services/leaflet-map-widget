/*
 * leaflet-map
 * https://github.com/mognom/leaflet-map-widget
 *
 * Copyright (c) 2018 CoNWeT
 * Licensed under the MIT license.
 */

/* globals L HeatmapOverlay*/

(function () {

    "use strict";

    var PoIs = {};
    var extraMarkers = {};
    var map;
    var baseMaps;
    var markerClusterGroup;

    // Leaflet.awesome-markers range of colours except white
    var colors = ['red', 'blue', 'green', 'purple', 'orange', 'darkred', 'lightred', 'beige', 'darkblue', 'darkgreen', 'cadetblue', 'darkpurple', 'pink', 'lightblue', 'lightgreen', 'gray', 'black', 'lightgray'];

    var TileLayer = {
        CartoDB_Voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19}),

        OSM_Mapnik: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),

        OSM_DE: L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),

        default: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> attribution: Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
        })
    };

    // Start listening to endpoints and initialize map base layer
    var init = function init() {
        build_map();

        // Register callbacks
        MashupPlatform.wiring.registerCallback('poiInput', function (poi_info) {
            poi_info = parseInputEndpointData(poi_info);

            if (!Array.isArray(poi_info)) {
                poi_info = [poi_info];
            }
            poi_info.forEach(registerPoI);

            sendVisiblePoIs();
            centerMapPoIs();
        });

        MashupPlatform.wiring.registerCallback('replacePoIs', function (poi_info) {
            poi_info = parseInputEndpointData(poi_info);

            removeAllPoIs();
            if (!Array.isArray(poi_info)) {
                poi_info = [poi_info];
            }
            poi_info.forEach(registerPoI);

            sendVisiblePoIs();
            centerMapPoIs();
        });

        MashupPlatform.wiring.registerCallback("heatmap", function (config) {
            var data = parseInputEndpointData(config);

            addHeatmap(data);
        });

        MashupPlatform.wiring.registerCallback('deletePoiInput', function (poi_info) {
            poi_info = parseInputEndpointData(poi_info);

            if (!Array.isArray(poi_info)) {
                poi_info = [poi_info];
            }
            poi_info.forEach(removePoI);
            centerMapPoIs();
        });

    };

    var parseInputEndpointData = function parseInputEndpointData(data) {
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                throw new MashupPlatform.wiring.EndpointTypeError();
            }
        } else if (data == null || typeof data !== "object") {
            throw new MashupPlatform.wiring.EndpointTypeError();
        }
        return data;
    };

    var build_base_style = function build_base_style(poi_info) {
        var icon, markerColor, startIcon, endIcon, color;
        color = colors[Math.floor(Math.random()*colors.length)];

        if ('location' in poi_info) {
            switch (poi_info.location.type) {
            case 'Point':
                if (poi_info.icon.indexOf("ngsientity2poi") >= 0) {
                    icon = (MashupPlatform.prefs.get("iconName").trim() !== "") ? MashupPlatform.prefs.get("iconName").trim() : 'circle'; // default markerColor is 'circle'
                    markerColor = (MashupPlatform.prefs.get("markerColor").trim() !== "") ? MashupPlatform.prefs.get("markerColor").trim() :'blue';  // default markerColor is 'blue'

                    poi_info.icon = L.AwesomeMarkers.icon({icon: icon, prefix: 'fa', markerColor: markerColor, iconColor: '#fff'});

                } else {
                    poi_info.icon = L.icon({
                        iconUrl: poi_info.icon,
                        iconSize: [35, 35], // size of the icon
                    });
                }
                break;

            case 'Polygon':
            case 'MultiPolygon':
                poi_info.polygon_style = {
                    color: "#ff7256"
                };
                break;

            case 'LineString':
            case 'MultiLineString':
            case 'Polyline':
            case 'MultiPolyline':
                poi_info.polyline_style = {
                    color: color,
                    weight: 3,
                    dashArray: '10,10'
                };

                // default markerColor is 'home'
                if (MashupPlatform.prefs.get("startPointMarkerLine").trim() !== "") {
                    startIcon = MashupPlatform.prefs.get("startPointMarkerLine").trim();
                    poi_info.startIcon = L.AwesomeMarkers.icon({icon: startIcon, prefix: 'fa', markerColor: color, iconColor: '#fff'});
                }

                // default markerColor is 'home'
                if (MashupPlatform.prefs.get("endPointMarkerLine").trim() !== "") {
                    endIcon = MashupPlatform.prefs.get("endPointMarkerLine").trim();
                    poi_info.endIcon = L.AwesomeMarkers.icon({icon: endIcon, prefix: 'fa', markerColor: color, iconColor: '#fff'})
                }

            }
        }
    };

    var build_map = function build_map() {
        var initialCenter = MashupPlatform.prefs.get("initialCenter").split(",").map(Number);
        if (initialCenter.length != 2 || !Number.isFinite(initialCenter[0]) || !Number.isFinite(initialCenter[1])) {
            initialCenter = [0, 0];
        }

        map = new L.Map('mapid', {
            center: new L.LatLng(initialCenter[1], initialCenter[0]),
            zoom: parseInt(MashupPlatform.prefs.get('initialZoom'), 10),
            layers: [TileLayer.OSM_Mapnik, TileLayer.OSM_DE, TileLayer.CartoDB_Voyager, TileLayer.default]
        });

        baseMaps = {
            "OSM Mapnik": TileLayer.OSM_Mapnik,
            "OSM DE": TileLayer.OSM_DE,
            "CartoDB Voyager": TileLayer.CartoDB_Voyager,
            "OSM Default": TileLayer.default,
        };

        L.control.layers(baseMaps, null).addTo(map);

        // Initializing a MarkerClusterGroup for the cluster
        markerClusterGroup = L.markerClusterGroup();

        map.on("moveend", sendVisiblePoIs);
        map.on("zoomend", sendVisiblePoIs);
    };

    var registerPoI = function registerPoI(poi_info) {
        var poi, marker, marker_location_A, marker_location_B;
        poi = PoIs[poi_info.id];

        build_base_style(poi_info);

        if ('location' in poi_info) {
                switch (poi_info.location.type) {
                case 'Point':
                    // L.geoJSON works out of the box with coordinates that follow the GeoJSON spec (lon/lat).
                    // Points are handled differently than polylines and polygons
                    // pointToLayer: This function is passed a LatLng and should return an instance of ILayer, in this case likely a Marker or CircleMarker
                    marker = L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates }], {
                        pointToLayer: function (feature, latlng) {
                            if (poi == null) {
                                poi = L.marker(latlng,{icon: poi_info.icon });
                                return poi;
                            } else {
                                poi.setLatLng(latlng);
                            }
                        }
                    });

                    break;

                case 'Polygon':
                case 'MultiPolygon':
                    if (poi == null) {
                        L.geoJSON([{ "type": "Polygon", "coordinates": [poi_info.location.coordinates] }], {
                            style: function (feature) {
                                return {color: poi_info.polygon_style.color }
                                },
                            onEachFeature: function (feature, layer) {
                                poi = layer;
                            }
                        }).addTo(map);

                    } else {
                        // remove old layer and add new
                        map.eachLayer(function (layer) {
                            if ('data' in layer) {
                                if (layer.data.id === poi.data.id) {
                                    map.removeLayer(layer);
                                }
                            }
                        });

                        L.geoJSON([{ "type": "Polygon", "coordinates": [poi_info.location.coordinates] }], {
                            style: function (feature) {
                                return {color: poi_info.polygon_style.color };
                                },
                            onEachFeature: function (feature, layer) {
                                // set poi to empty object and assign the new layer to poi
                                for (var key in poi) {
                                    delete poi[key];
                                }
                                poi = layer;
                            }
                        }).addTo(map);
                    }
                    break;

                case 'LineString':
                case 'MultiLineString':
                case 'Polyline':
                case 'MultiPolyline':
                    var line_color = poi_info.polyline_style.color;

                    if (poi == null) {
                        L.geoJSON([{ "type": "LineString", "coordinates": poi_info.location.coordinates }], {
                            style: function (feature) {
                                // Adjustment of colors that cannot be displayed using L.Polyline.
                                if(poi_info.polyline_style.color === 'lightred') line_color = 'salmon';
                                if(poi_info.polyline_style.color === 'darkpurple') line_color = 'darkmagenta';
                                if(poi_info.polyline_style.color === 'beige') line_color = 'tan';

                                return {color: line_color,  weight: poi_info.polyline_style.weight , dashArray: poi_info.polyline_style.dashArray};
                            },
                            onEachFeature: function (feature, layer) {
                                poi = layer;
                            }
                        }).addTo(map);


                        // Markers are set on the start (marker_location_A) coordinates as well as on the target (marker_location_B) coordinates
                        // of the coordinate series to ensure an improved overview.
                        if(poi_info.hasOwnProperty('startIcon')) {
                            marker_location_A = L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[0] }],{
                                pointToLayer: function (feature, latlng) {
                                    return L.marker(latlng,{icon: poi_info.startIcon });
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Start: " + poi_info.id + "</b>");
                                }
                            });
                        }

                        if (poi_info.hasOwnProperty('endIcon')) {
                            marker_location_B = L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[poi_info.location.coordinates.length - 1] }], {
                                pointToLayer: function (feature, latlng) {
                                    return L.marker(latlng,{icon: poi_info.endIcon });
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Target: " + poi_info.id + "</b>");
                                }
                            });
                        }

                    } else {
                        // remove old layer for update
                        map.eachLayer(function (layer) {
                            if ('data' in layer) {
                                if (layer.data.id === poi.data.id) {
                                    map.removeLayer(layer);
                                }
                            }
                            // remove extraMarker for update
                            if ('extraMarker' in layer) {
                                if (layer.extraMarkerId === poi.data.id && markerClusterGroup.hasLayer(layer)) {
                                    markerClusterGroup.removeLayer(layer);
                                    map.removeLayer(layer);
                                }
                            }
                        });

                        L.geoJSON([{ "type": "LineString", "coordinates": poi_info.location.coordinates }], {
                            style: function (feature) {
                                // Adjustment of colors that cannot be displayed using L.Polyline.
                                if(poi_info.polyline_style.color === 'lightred') line_color = 'salmon';
                                if(poi_info.polyline_style.color === 'darkpurple') line_color = 'darkmagenta';
                                if(poi_info.polyline_style.color === 'beige') line_color = 'tan';

                                return {color: line_color, weight: poi_info.polyline_style.weight , dashArray: poi_info.polyline_style.dashArray};
                            },
                            onEachFeature: function (feature, layer) {
                                // set poi to empty object and assign the new layer to poi
                                for (var key in poi) {
                                    delete poi[key];
                                }
                                poi = layer;
                            }
                        }).addTo(map);

                        if(poi_info.hasOwnProperty('startIcon')) {
                            marker_location_A = L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[0] }],{
                                pointToLayer: function (feature, latlng) {
                                    extraMarkers[poi_info.id] = L.marker(latlng,{icon: poi_info.startIcon });
                                    return extraMarkers[poi_info.id];
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Start: " + poi_info.id + "</b>");
                                }
                            });
                        }

                        if (poi_info.hasOwnProperty('endIcon')) {
                            marker_location_B = L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[poi_info.location.coordinates.length - 1] }], {
                                pointToLayer: function (feature, latlng) {
                                    extraMarkers[poi_info.id] = L.marker(latlng,{icon: poi_info.endIcon });
                                    return extraMarkers[poi_info.id];
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Target: " + poi_info.id + "</b>");
                                }
                            });
                        }
                    }
                    break;
                }
        }

        // Popup Settings
        if (poi_info.title && (poi_info.id !== poi_info.title)) {
            if (poi_info.infoWindow) {
                poi.bindPopup("<b>" + poi_info.title + "</b><br>" + poi_info.infoWindow);
            } else {
                poi.bindPopup("<b>" + poi_info.title + "</b>");
            }
        } else {
            if (poi_info.infoWindow) {
                poi.bindPopup("<b>" + poi_info.infoWindow + "</b>");
            } else {
                poi.bindPopup("<b>" + poi_info.id + "</b>");
            }
        }

        if (marker != null) markerClusterGroup.addLayer(marker);
        if (marker_location_A != null) markerClusterGroup.addLayer(marker_location_A);
        if (marker_location_B != null) markerClusterGroup.addLayer(marker_location_B);
        map.addLayer(markerClusterGroup);

        // Save PoI data to send it on the map's outputs
        poi.data = poi_info;

        // bind event to send function
        poi.on("click", sendSelectedPoI.bind(poi));

        PoIs[poi_info.id] = poi;
    };

    // Remove all layers
    var removeAllPoIs = function removeAllPoIs() {
        // First clear MarkerClusterGroup.
        if(markerClusterGroup.getLayers().length > 0) {
            markerClusterGroup.clearLayers();
        }

        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
                map.removeLayer(layer);
            }
        });

        // After emptying the map, set PoIs and extraMarkers to empty
        PoIs = {};
        extraMarkers = {};
    };

    // Remove a marker from the map
    var removePoI = function removePoI(poi) {
        // First check whether extraMarkers in the MarkerClusterGroup need to be removed.
        if(markerClusterGroup.getLayers().length > 0) {
            markerClusterGroup.eachLayer(function (layer) {
                if ('extraMarker' in layer && layer.extraMarkerId === poi.id) {
                    markerClusterGroup.removeLayer(layer);
                }
            });
        }

        map.removeLayer(PoIs[poi.id]);

        // Remove object from PoIs and extraMarkers
        for (var layer in extraMarkers) {
            if ('extraMarker' in extraMarkers[layer] && extraMarkers[layer].extraMarkerId === poi.id) {
                delete extraMarkers[layer];
            }
        }

        delete PoIs[poi.id];
    };

    var centerMapPoIs = function centerMapPoIs() {
        var boundary;
        var data = [];

        var initialCenter = MashupPlatform.prefs.get("initialCenter").split(",").map(Number);

        if (initialCenter.length != 2 || !Number.isFinite(initialCenter[0]) || !Number.isFinite(initialCenter[1])) {

            for (var poi in PoIs) {
                if ('_latlng' in PoIs[poi]) {
                    data.push([PoIs[poi].getLatLng().lat, PoIs[poi].getLatLng().lng]);
                }

                if ('_latlngs' in PoIs[poi]) {
                    // Polygon and MultiPolygon returns an array of arrays
                    if (PoIs[poi].data.type === 'Polygon' || PoIs[poi].data.location.type === 'MultiPolygon') {
                        var coords = PoIs[poi].getLatLngs()[0];
                        for (var obj in coords) {
                            data.push([coords[obj].lat, coords[obj].lng]);
                        }

                    } else {
                        var latLngs = PoIs[poi].getLatLngs();
                        for (var coord in latLngs) {
                            data.push([latLngs[coord].lat, latLngs[coord].lng]);
                        }
                    }
                }

                boundary = L.polygon([data]).getBounds();
            }

            if (boundary != null) {
                map.panInsideBounds(boundary);
            }
        }
    };

    var sendVisiblePoIs = function sendVisiblePoIs() {
        // Skip if there no endpoint connected
        if (!MashupPlatform.widget.outputs.poiListOutput.connected) {
            return;
        }

        // Gather visible pois
        var data = [];
        for (var poi in PoIs) {
            if (map.getBounds().contains(PoIs[poi].getLatLng())) {
                data.push(PoIs[poi].data);
            }
        }

        MashupPlatform.widget.outputs.poiListOutput.pushEvent(data);
    };

    // TODO extraMakers are not sent
    var sendSelectedPoI = function sendSelectedPoI() {
        MashupPlatform.widget.outputs.poiListOutput.pushEvent(this.data);
    };

    // Add a heatmap layer
    var heatmapLayer;
    var addHeatmap = function addHeatmap(data) {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }

        if (data.features.length <= 0) {
            return;
        }

        var cfg = {
            // radius should be small ONLY if scaleRadius is true (or small radius is intended)
            // if scaleRadius is false it will be the constant radius used in pixels
            "radius": data.radius,
            "maxOpacity": 0.8,
            // scales the radius based on map zoom
            "scaleRadius": true,
            // if set to false the heatmap uses the global maximum for colorization
            // if activated: uses the data maximum within the current map boundaries
            //   (there will always be a red spot with useLocalExtremas true)
            "useLocalExtrema": data.useLocalExtrema || true,
            // which field name in your data represents the latitude - default "lat"
            latField: 'lat',
            // which field name in your data represents the longitude - default "lng"
            lngField: 'lng',
            // which field name in your data represents the data value - default "value"
            valueField: 'weight'
        };

        heatmapLayer = new HeatmapOverlay(cfg);
        heatmapLayer.addTo(map);

        var source = {
            max: data.max,
            data: data.features
        };
        heatmapLayer.setData(source);
    };

    init();

})();