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

    var PoIs = {},
        extraMarkers = {},
        map,
        baseMaps,
        markerClusterGroup, // Plugin https://github.com/Leaflet/Leaflet.markercluster
        layerGroup, // Plugin https://github.com/PitouGames/Leaflet.Polyline.SnakeAnim
        seqGroup; // Plugin https://github.com/Igor-Vladyka/leaflet.motion

    // Leaflet.awesome-markers range of colours except white
    var colors = ['red', 'blue', 'green', 'purple', 'orange', 'darkred', 'lightred', 'beige', 'darkblue', 'darkgreen', 'cadetblue', 'darkpurple', 'pink', 'lightblue', 'lightgreen', 'gray', 'black', 'lightgray'];

    var TileLayer = {
        CartoDB_Voyager: L.tileLayer(`${window.location.protocol}//{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19
        }),
        CartoDB_Positron: L.tileLayer(`${window.location.protocol}//{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`, {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }),

        OSM_Mapnik: L.tileLayer(`${window.location.protocol}//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),

        OSM_DE: L.tileLayer(`${window.location.protocol}//{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png`, {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

            if (MashupPlatform.prefs.get("useSnakeAnimation") === true && layerGroup.getLayers().length > 0) {
                run_snake_animation();
                setInterval(run_snake_animation, 3000);
            }

            if (MashupPlatform.prefs.get("useDrawingPath") === true) {
                run_motion_animation();
                setInterval(run_motion_animation, 62000);
            }
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

            if (MashupPlatform.prefs.get("useSnakeAnimation") === true && layerGroup.getLayers().length > 0) {
                run_snake_animation();
                setInterval(run_snake_animation, 3000);
            }

            if (MashupPlatform.prefs.get("useDrawingPath") === true) {
                run_motion_animation();
                setInterval(run_motion_animation, 62000);
            }
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

            if (MashupPlatform.prefs.get("useSnakeAnimation") === true && layerGroup.getLayers().length > 0) {
                run_snake_animation();
                setInterval(run_snake_animation, 3000);
            }

            if (MashupPlatform.prefs.get("useDrawingPath") === true) {
                run_motion_animation();
                setInterval(run_motion_animation, 62000);
            }
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

    // Plugin https://github.com/PitouGames/Leaflet.Polyline.SnakeAnim
    var run_snake_animation = function run_snake_animation() {
        layerGroup.snakeIn();
    };

    // Plugin https://github.com/Igor-Vladyka/leaflet.motion
    var run_motion_animation = function run_motion_animation() {
        if (map.hasLayer(seqGroup)) {
            map.removeLayer(seqGroup);
        }
        var polylineMotionCollection = [];
        var marker = (MashupPlatform.prefs.get("iconName").trim() !== "") ? MashupPlatform.prefs.get("iconName").trim() : 'circle'; // default markerColor is 'circle'
        var markerColor = (MashupPlatform.prefs.get("markerColor").trim() !== "") ? MashupPlatform.prefs.get("markerColor").trim() :'blue';

        for (var poi in PoIs) {
            if (PoIs[poi] instanceof L.Polyline) {
                polylineMotionCollection.push(
                    L.motion.polyline(PoIs[poi].getLatLngs(), {
                        color: '#0099cc',
                        weight: 4,
                        dashArray: '10,10'
                    }, {
                        easing: L.Motion.Ease.easeInOutQuad
                    }, {
                        removeOnEnd: false,
                        icon: L.divIcon({
                            html: '<span class="fa-stack" style="vertical-align: top;"><i class="fas fa-circle fa-stack-2x fa-flip-horizontal" style="color: '+ markerColor +'"></i><i class="fas fa-'+ marker +' fa-stack-1x fa-inverse fa-flip-horizontal"></i></span>'
                        })
                    }).motionDuration(60000).bindPopup(PoIs[poi].getPopup())
                )
            }
        }

        // as L.featureGroup - to run all animation at same time
        seqGroup = L.motion.group(polylineMotionCollection);
        seqGroup.addTo(map);
        seqGroup.motionStart();
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
                    weight: 4,
                    dashArray: '10,10'
                };

                //TODO: Control
                if (MashupPlatform.prefs.get("useDrawingPath") === false && MashupPlatform.prefs.get("useMovingMarker") === false) {
                    if (MashupPlatform.prefs.get("startPointMarkerLine").trim() !== "") {
                        startIcon = MashupPlatform.prefs.get("startPointMarkerLine").trim();
                        poi_info.startIcon = L.AwesomeMarkers.icon({icon: startIcon, prefix: 'fa', markerColor: color, iconColor: '#fff'});
                    }

                    if (MashupPlatform.prefs.get("endPointMarkerLine").trim() !== "") {
                        endIcon = MashupPlatform.prefs.get("endPointMarkerLine").trim();
                        poi_info.endIcon = L.AwesomeMarkers.icon({icon: endIcon, prefix: 'fa', markerColor: color, iconColor: '#fff'})
                    }
                }

                if (MashupPlatform.prefs.get("useMovingMarker") === true && MashupPlatform.prefs.get("useDrawingPath") === false) {
                    if (poi_info.icon.indexOf("ngsientity2poi") >= 0) {
                        icon = (MashupPlatform.prefs.get("iconName").trim() !== "") ? MashupPlatform.prefs.get("iconName").trim() : 'circle'; // default markerColor is 'circle'
                        poi_info.icon = L.AwesomeMarkers.icon({icon: icon, prefix: 'fa', markerColor: color, iconColor: '#fff'});

                    }
                }
                break;
            }
        }
    };

    var build_map = function build_map() {
        var baseLayer;
        var initialCenter = MashupPlatform.prefs.get("initialCenter").split(",").map(Number);
        if (initialCenter.length != 2 || !Number.isFinite(initialCenter[0]) || !Number.isFinite(initialCenter[1])) {
            initialCenter = [0, 0];
        }

        if (MashupPlatform.prefs.get("tileLayer").trim() === '') {
            baseLayer = TileLayer.OSM_DE;
        } else {
            if (MashupPlatform.prefs.get("tileLayer").trim() !== 'CartoDB_Voyager' && MashupPlatform.prefs.get("tileLayer").trim() !== 'CartoDB_Positron' && MashupPlatform.prefs.get("tileLayer").trim() !== 'OSM_Mapnik' && MashupPlatform.prefs.get("tileLayer").trim() !== 'OSM_DE') {
                throw new MashupPlatform.wiring.EndpointValueError("Only the tile layers: 'CartoDB_Voyager', 'CartoDB_Positron', 'OSM_Mapnik' and 'OSM_DE' are supported.");
            } else {
                baseLayer = TileLayer[`${MashupPlatform.prefs.get("tileLayer").trim()}`];
            }
        }

        map = new L.Map('mapid', {
            center: new L.LatLng(initialCenter[1], initialCenter[0]),
            zoom: parseInt(MashupPlatform.prefs.get('initialZoom'), 10),
        });
        baseLayer.addTo(map);

        baseMaps = {
            "CartoDB Voyager": TileLayer.CartoDB_Voyager,
            "CartoDB Positron": TileLayer.CartoDB_Positron,
            "OSM Mapnik": TileLayer.OSM_Mapnik,
            "OSM DE": TileLayer.OSM_DE
        };

        L.control.layers(baseMaps, null).addTo(map);

        // Initializing a MarkerClusterGroup for the cluster
        markerClusterGroup = L.markerClusterGroup();

        // Initializing a layerGroup for the snake animation
        layerGroup = L.layerGroup();

        map.on("moveend", sendVisiblePoIs);
        map.on("zoomend", sendVisiblePoIs);
    };

    var registerPoI = function registerPoI(poi_info) {
        var poi, marker_location_A, marker_location_B;

        var useclustering = MashupPlatform.prefs.get("useClustering");
        var useSnakeAnimation = MashupPlatform.prefs.get("useSnakeAnimation");
        var useDrawingPathAnimation  = MashupPlatform.prefs.get("useDrawingPath");
        var useMovingMarker = MashupPlatform.prefs.get("useMovingMarker");

        poi = PoIs[poi_info.id];

        build_base_style(poi_info);

        if ('location' in poi_info) {
                switch (poi_info.location.type) {
                case 'Point':
                    // L.geoJSON works out of the box with coordinates that follow the GeoJSON spec (lon/lat).
                    // Points are handled differently than polylines and polygons
                    // pointToLayer: This function is passed a LatLng and should return an instance of ILayer, in this case likely a Marker or CircleMarker
                    L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates }], {
                        pointToLayer: function (feature, latlng) {
                            if (poi == null) {
                                poi = L.marker(latlng,{icon: poi_info.icon });
                                if (useclustering === true) markerClusterGroup.addLayer(poi)
                                return poi;
                            } else {
                                if (useclustering === true) {
                                    if (markerClusterGroup.hasLayer(PoIs[poi_info.id])) {
                                        markerClusterGroup.getLayer(L.stamp(PoIs[poi_info.id])).setLatLng(latlng);
                                    }
                                } else {
                                    poi.setLatLng(latlng);
                                }
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
                        // Markers are set on the start (marker_location_A) coordinates as well as on the target (marker_location_B) coordinates
                        // of the coordinate series to ensure an improved overview.
                        if(poi_info.hasOwnProperty('startIcon') && useDrawingPathAnimation === false) {
                            L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[0] }],{
                                pointToLayer: function (feature, latlng) {
                                    return L.marker(latlng,{icon: poi_info.startIcon });
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Point of departure: " + poi_info.id + "</b>");
                                    marker_location_A = layer;
                                    if (useclustering === true) markerClusterGroup.addLayer(marker_location_A);
                                    if (useSnakeAnimation === true) {
                                        layerGroup.addLayer(marker_location_A);
                                        layerGroup._snakingLayers.push(marker_location_A);
                                    }
                                }
                            });
                        }

                        L.geoJSON([{ "type": "LineString", "coordinates": poi_info.location.coordinates }], {
                            style: function (feature) {
                                // Adjustment of colors that cannot be displayed using L.Polyline.
                                if(poi_info.polyline_style.color === 'lightred') line_color = 'salmon';
                                if(poi_info.polyline_style.color === 'darkpurple') line_color = 'darkmagenta';
                                if(poi_info.polyline_style.color === 'beige') line_color = 'tan';

                                if (useSnakeAnimation === true) {
                                    return {color: line_color, weight: poi_info.polyline_style.weight, dashArray: poi_info.polyline_style.dashArray, snakingSpeed: 200, followHead: false};
                                }
                                else {
                                    return {color: line_color, weight: poi_info.polyline_style.weight, dashArray: poi_info.polyline_style.dashArray};
                                }
                            },
                            onEachFeature: function (feature, layer) {
                                poi = layer;
                                if (useSnakeAnimation === true) {
                                    layerGroup.addLayer(layer);
                                    layerGroup._snakingLayers.push(layer);
                                }
                            }
                        });

                        if (poi_info.hasOwnProperty('endIcon')  && useDrawingPathAnimation === false) {
                            L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[poi_info.location.coordinates.length - 1] }], {
                                pointToLayer: function (feature, latlng) {
                                    return L.marker(latlng,{icon: poi_info.endIcon });
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Travel destination: " + poi_info.id + "</b>");
                                    marker_location_B = layer;
                                    if (useclustering === true) markerClusterGroup.addLayer(marker_location_B);
                                    if (useSnakeAnimation === true) {
                                        layerGroup.addLayer(marker_location_B);
                                        layerGroup._snakingLayers.push(marker_location_B);
                                    }

                                }
                            });
                        }

                    } else {
                        // remove layer in layerGroup._snakingLayers for update
                        if (useSnakeAnimation === true) {
                            layerGroup.snakeReset();

                            //set snakeRemoveLayers false to receive all layers in layerGroup
                            layerGroup.options.snakeRemoveLayers = false;

                            for (var snakelayer in layerGroup._snakingLayers) {
                                if (layerGroup._snakingLayers.hasOwnProperty(snakelayer)) {
                                    if ('extraMarker' in layerGroup._snakingLayers[snakelayer] && layerGroup._snakingLayers[snakelayer] instanceof L.Marker) {
                                        if (layerGroup._snakingLayers[snakelayer].extraMarkerId === poi.data.id && layerGroup.hasLayer(layerGroup._snakingLayers[snakelayer]) ) {
                                            delete layerGroup._snakingLayers[snakelayer];
                                        }
                                    }
                                    if (layerGroup._snakingLayers[snakelayer] instanceof L.Polyline ) {
                                        if (layerGroup._snakingLayers[snakelayer].data.id === poi.data.id) {
                                            delete layerGroup._snakingLayers[snakelayer];
                                        }
                                    }
                                }
                            }

                            // remove undefined layers from layerGroup._snakingLayers
                            layerGroup._snakingLayers = layerGroup._snakingLayers.filter(function (element) {
                                return element;
                            });
                        }

                        // remove old layer for update
                        map.eachLayer(function (layer) {
                            if ('data' in layer) {
                                if (layer.data.id === poi.data.id) {
                                    if (layerGroup.hasLayer(layer)) {
                                        layerGroup.removeLayer(layer);
                                        map.removeLayer(layer);
                                    } else {
                                        map.removeLayer(layer);
                                    }
                                }
                            }
                            // remove extraMarker for update
                            if ('extraMarker' in layer) {
                                if (layer.extraMarkerId === poi.data.id) {
                                    if (markerClusterGroup.hasLayer(layer)) {
                                        markerClusterGroup.removeLayer(layer);
                                    }
                                    if (layerGroup.hasLayer(layer)) {
                                        layerGroup.removeLayer(layer);

                                    }
                                    map.removeLayer(layer);
                                }
                            }
                        });

                        if (useSnakeAnimation === true) layerGroup.options.snakeRemoveLayers = true;

                        if(poi_info.hasOwnProperty('startIcon')  && useDrawingPathAnimation === false) {
                            L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[0] }],{
                                pointToLayer: function (feature, latlng) {
                                    extraMarkers[poi_info.id] = L.marker(latlng,{icon: poi_info.startIcon });
                                    return extraMarkers[poi_info.id];
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Start: " + poi_info.id + "</b>");
                                    marker_location_A = layer;
                                    if (useclustering === true) markerClusterGroup.addLayer(marker_location_A);
                                    if (useSnakeAnimation === true) {
                                        layerGroup.addLayer(marker_location_A);
                                        layerGroup._snakingLayers.push(marker_location_A);
                                    }
                                }
                            });
                        }

                        L.geoJSON([{ "type": "LineString", "coordinates": poi_info.location.coordinates }], {
                            style: function (feature) {
                                // Adjustment of colors that cannot be displayed using L.Polyline.
                                if(poi_info.polyline_style.color === 'lightred') line_color = 'salmon';
                                if(poi_info.polyline_style.color === 'darkpurple') line_color = 'darkmagenta';
                                if(poi_info.polyline_style.color === 'beige') line_color = 'tan';

                                if (useSnakeAnimation === true) {
                                    return {color: line_color, weight: poi_info.polyline_style.weight, dashArray: poi_info.polyline_style.dashArray, snakingSpeed: 200, followHead: false};
                                }
                                else {
                                    return {color: line_color, weight: poi_info.polyline_style.weight, dashArray: poi_info.polyline_style.dashArray};
                                }
                            },
                            onEachFeature: function (feature, layer) {
                                poi = {};
                                poi = layer;
                                if (useSnakeAnimation === true) {
                                    layerGroup.addLayer(layer);
                                    layerGroup._snakingLayers.push(layer);
                                }
                            }
                        });

                        if (poi_info.hasOwnProperty('endIcon') && useDrawingPathAnimation === false) {
                            L.geoJSON([{ "type": "Point", "coordinates": poi_info.location.coordinates[poi_info.location.coordinates.length - 1] }], {
                                pointToLayer: function (feature, latlng) {
                                    extraMarkers[poi_info.id] = L.marker(latlng,{icon: poi_info.endIcon });
                                    return extraMarkers[poi_info.id];
                                },
                                onEachFeature: function (feature, layer) {
                                    layer.extraMarker = 'true';
                                    layer.extraMarkerId = poi_info.id;
                                    extraMarkers['extraMarker_'+L.stamp(layer)] = layer;
                                    layer.bindPopup("<b>Target: " + poi_info.id + "</b>");
                                    marker_location_B = layer;
                                    if (useclustering === true) markerClusterGroup.addLayer(marker_location_B);
                                    if (useSnakeAnimation === true) {
                                        layerGroup.addLayer(marker_location_B);
                                        layerGroup._snakingLayers.push(marker_location_B);
                                    }
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

        if (useclustering === true) {
            map.addLayer(markerClusterGroup);
        }

        if (useSnakeAnimation === true && layerGroup.getLayers().length > 0) {
            map.addLayer(layerGroup);
        }

        if (!markerClusterGroup.hasLayer(poi) && !layerGroup.hasLayer(poi)) {
            if (marker_location_A != null && useMovingMarker === false) marker_location_A.addTo(map);
            if ((useDrawingPathAnimation === true && !(poi instanceof L.Polyline)) || (useDrawingPathAnimation === false && poi instanceof L.Polyline)) {
                poi.addTo(map);

                // https://github.com/zjffun/Leaflet.MovingMarker
                if (useMovingMarker === true && poi instanceof L.Polyline) {
                    var numberOfDuration = [];

                    // For each coordinate point in the polyline you have to specify motion duration
                    poi.getLatLngs().forEach(function (item, index) {
                        numberOfDuration.push(1000); // Duration is set to 1 seconds for each element
                    });

                    var movingMarker = L.Marker.movingMarker(poi.getLatLngs(), numberOfDuration, {autostart: true, loop: true}); // the marker will start automatically at the beginning of the polyline when the it arrives at the end
                    movingMarker.setIcon(poi_info.icon);
                    movingMarker.addTo(map);
                }
            }
            if (marker_location_B != null && useMovingMarker === false) marker_location_B.addTo(map);
        }

        // Save PoI data to send it on the map's outputs
        poi.data = poi_info;

        // bind event to send function
        poi.on("click", sendSelectedPoI.bind(poi));

        PoIs[poi_info.id] = poi;
    };

    // Remove all layers
    var removeAllPoIs = function removeAllPoIs() {
        // Clear MarkerClusterGroup.
        if(markerClusterGroup.getLayers().length > 0) {
            markerClusterGroup.clearLayers();
        }

        // Clear layerGroup and layerGroup._snakingLayers
        if(layerGroup.getLayers().length > 0) {
            layerGroup.snakeReset();
            layerGroup.options.snakeRemoveLayers = false;
            layerGroup._snakingLayers = [];
            layerGroup.clearLayers();

            if (MashupPlatform.prefs.get("useSnakeAnimation") === true) layerGroup.options.snakeRemoveLayers = true;
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
        // Check whether layer in the layerGroup or layerGroup._snakingLayers need to be removed.
        if(layerGroup.getLayers().length > 0) {
            layerGroup.snakeReset();
            layerGroup.options.snakeRemoveLayers = false;

            for (var snakelayer in layerGroup._snakingLayers) {
                if (layerGroup._snakingLayers.hasOwnProperty(snakelayer)) {
                    if ('extraMarker' in layerGroup._snakingLayers[snakelayer] && layerGroup._snakingLayers[snakelayer] instanceof L.Marker) {
                        if (layerGroup._snakingLayers[snakelayer].extraMarkerId === poi.id && layerGroup.hasLayer(layerGroup._snakingLayers[snakelayer]) ) {
                            delete layerGroup._snakingLayers[snakelayer];
                        }
                    }
                    if (layerGroup._snakingLayers[snakelayer] instanceof L.Polyline ) {
                        if (layerGroup._snakingLayers[snakelayer].data.id === poi.id) {
                            delete layerGroup._snakingLayers[snakelayer];
                        }
                    }
                }
            }

            // remove undefined layers from layerGroup._snakingLayers
            layerGroup._snakingLayers = layerGroup._snakingLayers.filter(function (element) {
                return element;
            });

            layerGroup.eachLayer(function (layer) {
                if ('extraMarker' in layer && layer.extraMarkerId === poi.id) {
                    layerGroup.removeLayer(layer);
                }
            });
        }

        map.eachLayer(function (layer) {
            if ('data' in layer) {
                if (layer.data.id === poi.id) {
                    if (layerGroup.hasLayer(layer)) {
                        layerGroup.removeLayer(layer);
                        map.removeLayer(layer);
                    } else {
                        map.removeLayer(layer);
                    }
                }
            }
            // remove extraMarker for update
            if ('extraMarker' in layer) {
                if (layer.extraMarkerId === poi.id) {
                    if (markerClusterGroup.hasLayer(layer)) {
                        markerClusterGroup.removeLayer(layer);
                    }
                    if (layerGroup.hasLayer(layer)) {
                        layerGroup.removeLayer(layer);

                    }
                    map.removeLayer(layer);
                }
            }
        });

        if (MashupPlatform.prefs.get("useSnakeAnimation") === true) layerGroup.options.snakeRemoveLayers = true;

        if (map.hasLayer(PoIs[poi.id])) map.removeLayer(PoIs[poi.id]);

        // Remove object from PoIs and extraMarkers
        for (var layer in extraMarkers) {
            if ('extraMarker' in extraMarkers[layer] && extraMarkers[layer].extraMarkerId === poi.id) {
                delete extraMarkers[layer];
            }
        }

        if (PoIs[poi.id] !== undefined) delete PoIs[poi.id];
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
                        if (PoIs[poi].getLatLngs().length === 1) {
                            for (var coord in latLngs[0]) {
                                data.push([latLngs[0][coord].lat, latLngs[0][coord].lng]);
                            }
                        } else {
                            for (var coord in latLngs) {
                                data.push([latLngs[coord].lat, latLngs[coord].lng]);
                            }

                        }
                    }
                }

                boundary = L.polygon([data]);
            }

            if (boundary != null) {
                map.fitBounds(boundary.getBounds(), { maxZoom: 18});
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