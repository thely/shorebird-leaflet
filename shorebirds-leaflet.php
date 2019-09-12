<?php
/**
 * Plugin Name: Shorebirds Sonifier Map
 * Plugin URI: http://www.becky-brown.org
 * Description: Displays and sonifies bird data from Cobb and Hog Islands
 * Version: 0.5
 * Text Domain: shorebirds-leaflet
 * Author: Becky Brown/Eli Stine
 * Author URI: http://www.becky-brown.org
 */

function shorebirds_leaflet_view($atts) {
	$folder = plugin_dir_path( __FILE__ );
	ob_start(); // start output buffer

    include $folder . 'index.php';
    $template = ob_get_contents(); // get contents of buffer
    ob_end_clean();

    wp_enqueue_script('birds-hrtf');
    wp_enqueue_script('birds-bundle');
    return $template;
}

add_shortcode('shorebirds-leaflet', 'shorebirds_leaflet_view');

function shorebirds_enqueue($atts) {
	$folder = plugin_dir_path( __FILE__ );
	wp_register_script('birds-hrtf', plugins_url("assets/js/hrtf.js", __FILE__), [], null, true);
	wp_register_script('birds-bundle', plugins_url("assets/js/bundle.js", __FILE__), ['birds-hrtf'], "0.7", true);
}

add_action('wp_enqueue_scripts','shorebirds_enqueue');
