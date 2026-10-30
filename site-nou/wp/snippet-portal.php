<?php
/*
 * WPCode → PHP Snippet „Portalul clientului (din GitHub)”, Run Everywhere.
 * Afișează portal.html din repo la cocktailphilosophy.ro/portal/, ca pagina de la bar (/bar/).
 * Linkul clientului rămâne cu codul după # (…/portal/#t=…); codul nu ajunge la WordPress.
 * Se reîmprospătează din GitHub la cel mult 10 minute; dacă GitHub nu răspunde, se folosește ultima copie bună.
 * Compatibil PHP 7.4.
 */
if (!defined('ABSPATH')) { return; }
if (!defined('CP_PORTAL_LOADED')) {
	define('CP_PORTAL_LOADED', true);
	define('CP_PORTAL_SRC', 'https://paulgeorgescutiberiu-web.github.io/COCKTAIL/portal.html');

	add_action('template_redirect', function () {
		$path = trim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
		if ($path !== 'portal') { return; }
		$key = 'cp_portal_html';
		$html = get_transient($key);
		if ($html === false) {
			$res = wp_remote_get(CP_PORTAL_SRC, array('timeout' => 8));
			$code = is_wp_error($res) ? 0 : wp_remote_retrieve_response_code($res);
			$html = $code === 200 ? wp_remote_retrieve_body($res) : '';
			if ($html !== '' && strpos($html, '</html>') !== false && strpos($html, 'portal/') !== false) {
				set_transient($key, $html, 10 * MINUTE_IN_SECONDS);
				update_option($key . '_backup', $html, false);
			} else {
				$html = (string) get_option($key . '_backup');
			}
		}
		if ($html === '') { return; }
		status_header(200);
		nocache_headers();
		header('Content-Type: text/html; charset=utf-8');
		header('X-Robots-Tag: noindex, nofollow');
		echo $html;
		exit;
	}, 1);
}
