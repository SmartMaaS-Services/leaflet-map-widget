[![](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/visualization.svg)](https://www.fiware.org/developers/catalogue/)

# Leaflet map viewer widget

The Leaflet map viewer widget is a [WireCloud widget](http://wirecloud.readthedocs.org/en/latest/).

[Leaflet](https://leafletjs.com/) is the leading open-source JavaScript library for mobile-friendly interactive 
maps and is also integrated into Wirecloud by means of this widget.

With this widget you have different possibilities to visualize and display your NGSIv2 data on a map depending on the 
entity type.

<p align="center">
    <img src="src/doc/images/leaflet-map_operator.png" alt="Leaflet Map Operator" width="450" height="340">
</p>

<p align="center">
    <img src="src/doc/images/leaflet-map_settings.png" alt="Operator Settings" idth="650" height="480">
</p>

The widget includes the following leaflet plugins, which you can use depending on your wishes and the NGSIv2 entities 
available:

* [Leaflet.MovingMarker](https://github.com/zjffun/Leaflet.MovingMarker)
* [Leaflet.Polyline.SnakeAnim](https://github.com/PitouGames/Leaflet.Polyline.SnakeAnim)
* [Leaflet.awesome-markers](https://github.com/lvoogdt/Leaflet.awesome-markers)
* [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)

## Examples of visualization options

- AirQualityObserved
  <p align="center">
    <img src="src/doc/images/example_for_AirQualityObserved.png" alt="AirQualityObserved NGSIv2 Data" width="450" height="340">
  </p>

- WeatherObserved
  <p align="center">
    <img src="src/doc/images/example_for_WeatherObserved.png" alt="WeatherObserved NGSIv2 Data" width="450" height="340">
  </p>

- Motion Animation
  <p align="center">
    <img src="src/doc/images/example_for_motion_animation.png" alt="Motion Animation NGSIv2 Data" width="450" height="560">
  </p>
        
- Moving Marker Animation
  <p align="center">
    <img src="src/doc/images/example_for_moving_marker_animation.png" alt="Moving Marker Animation NGSIv2 Data" width="450" height="560">
  </p>
 
- Snake Animation
  <p align="center">
    <img src="src/doc/images/example_for_snake_animation.png" alt="Motion Animation NGSIv2 Data" width="450" height="560">
  </p>

and much more...

Build
-----

Be sure to have installed [Node.js](http://node.js) and [Bower](http://bower.io) in your system. For example, you can install it on Ubuntu and Debian running the following commands:

```bash
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install npm
sudo npm install -g bower
```

Install other npm dependencies by running:

```bash
npm install
```

In order to build this operator you need to download grunt:

```bash
sudo npm install -g grunt-cli
```

And now, you can use grunt:

```bash
grunt
```

If everything goes well, you will find a wgt file in the `dist` folder.

## Documentation

Documentation about how to use this widget is available on the
[User Guide](src/doc/userguide.md). Anyway, you can find general information
about how to use widgets on the
[WireCloud's User Guide](https://wirecloud.readthedocs.io/en/stable/user_guide/)
available on Read the Docs.

## Copyright and License

Copyright (c) 2018 CoNWeT
Licensed under the MIT license.
