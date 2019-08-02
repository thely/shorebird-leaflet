<?php
/**
 * Plugin Name: Shorebirds Sonifier Map
 * Plugin URI: http://www.becky-brown.org
 * Description: Displays and sonifies bird data from Cobb and Hog Islands
 * Version: 0.1
 * Text Domain: shorebirds-leaflet
 * Author: Becky Brown/Eli Stine
 * Author URI: http://www.becky-brown.org
 */

function shorebirds_leaflet_view($atts) {
	$content = file_get_contents("index.html");
}

add_shorcode('shorebirds-leaflet', 'shorebirds_leaflet_view');