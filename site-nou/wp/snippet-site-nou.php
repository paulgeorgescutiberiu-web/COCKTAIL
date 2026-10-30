<?php
/*
 * WPCode → PHP Snippet „Site nou (din GitHub)” — Run Everywhere.
 * Afișează paginile din repo (folderul site-nou/) pe cocktailphilosophy.ro, ca la /bar/.
 *
 * STARE: LANSAT (30 oct 2026) — prima pagină și /meniu/, /oferte/, /nunti/, /corporate/, /petreceri/ vin din site-nou/.
 * Revenire la site-ul vechi: dezactivezi snippetul în WPCode (pagina 546 și restul WordPress au rămas neatinse).
 * Etapa de probă:  CP_SN_PREFIX = 'nou'  →  /nou/, /nou/meniu/, /nou/oferte/, /nou/nunti/, /nou/corporate/, /nou/petreceri/
 *                  paginile au noindex și banda „Versiune de probă”; restul site-ului rămâne neatins.
 * Lansare:         CP_SN_PREFIX = ''  și  CP_SN_LIVE = true  → prima pagină devine site-ul nou, fără noindex și fără bandă.
 * Paginile se reîmprospătează din GitHub la cel mult 10 minute. Dacă GitHub nu răspunde, se folosește ultima copie bună.
 * Compatibil PHP 7.4.
 */
if (!defined('ABSPATH')) { return; }
if (!defined('CP_SN_LOADED')) { // protecție: dacă snippetul e activ de două ori, a doua copie nu face nimic
	define('CP_SN_LOADED', true);


	define('CP_SN_PREFIX', '');
	define('CP_SN_LIVE', true);
	define('CP_SN_SRC', 'https://paulgeorgescutiberiu-web.github.io/COCKTAIL/site-nou/');
	define('CP_SN_ASSETS', 'https://paulgeorgescutiberiu-web.github.io/COCKTAIL/site-nou/');
	define('CP_SN_GA', 'G-ZZMFYTMEMF');

	function cp_sn_pages() {
		return array(
			''          => 'index.html',
			'meniu'     => 'meniu.html',
			'oferte'    => 'oferte.html',
			'nunti'     => 'nunti.html',
			'corporate' => 'corporate.html',
			'petreceri' => 'petreceri.html',
		);
	}

	function cp_sn_url($slug) {
		$base = CP_SN_PREFIX === '' ? '/' : '/' . CP_SN_PREFIX . '/';
		return $slug === '' ? $base : $base . $slug . '/';
	}

	function cp_sn_fetch($file) {
		$key = 'cp_sn_' . md5($file);
		$html = get_transient($key);
		if ($html !== false) { return $html; }
		$res = wp_remote_get(CP_SN_SRC . $file, array('timeout' => 8));
		$code = is_wp_error($res) ? 0 : wp_remote_retrieve_response_code($res);
		$html = $code === 200 ? wp_remote_retrieve_body($res) : '';
		if ($html !== '' && strpos($html, '</html>') !== false && strpos($html, 'class="proba"') !== false) {
			set_transient($key, $html, 10 * MINUTE_IN_SECONDS);
			update_option($key . '_backup', $html, false);
			return $html;
		}
		$backup = get_option($key . '_backup');
		return $backup ? $backup : '';
	}

	function cp_sn_rewrite($html) {
		// legăturile între pagini → adresele de pe cocktailphilosophy.ro
		foreach (cp_sn_pages() as $slug => $file) {
			$html = preg_replace('/href="' . preg_quote($file, '/') . '(#[^"]*)?"/', 'href="' . cp_sn_url($slug) . '$1"', $html);
		}
		// pozele, fonturile și stilurile rămân găzduite pe GitHub Pages
		$html = preg_replace('/(src|href)="(img\/|fonts\/|stil\.css|fonturi\.css)/', '$1="' . CP_SN_ASSETS . '$2', $html);
		// Google Analytics (același tag ca pe restul site-ului)
		$ga = '<script async src="https://www.googletagmanager.com/gtag/js?id=' . CP_SN_GA . '"></script>'
			. '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' . CP_SN_GA . '");</script>';
		$html = str_replace('</head>', $ga . "\n</head>", $html);
		if (CP_SN_LIVE) {
			$html = str_replace('<meta name="robots" content="noindex, nofollow">', '', $html);
			$html = preg_replace('/<div class="proba">.*?<\/div>\s*/s', '', $html);
		}
		return $html;
	}

	add_action('template_redirect', function () {
		$path = trim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
		if (CP_SN_PREFIX !== '') {
			if ($path !== CP_SN_PREFIX && strpos($path, CP_SN_PREFIX . '/') !== 0) { return; }
			$path = trim(substr($path, strlen(CP_SN_PREFIX)), '/');
		}
		if (CP_SN_PREFIX === '' && ($path === 'nou' || strpos($path, 'nou/') === 0)) { // adresele din perioada de probă
			wp_safe_redirect(home_url('/' . trim(substr($path, 3), '/') . ($path === 'nou' ? '' : '/')), 301);
			exit;
		}
		$pages = cp_sn_pages();
		if (!isset($pages[$path])) { return; }
		if ($path === '' && !empty($_GET)) { // prima pagină doar fără parametri WordPress (?s=, ?p= etc.)
			foreach (array_keys($_GET) as $k) {
				if (!preg_match('/^(utm_[a-z]+|fbclid|gclid|v|t)$/', $k)) { return; }
			}
		}
		$html = cp_sn_fetch($pages[$path]);
		if ($html === '') { return; } // nu avem pagina: lăsăm WordPress să afișeze ce avea
		status_header(200);
		nocache_headers();
		header('Content-Type: text/html; charset=utf-8');
		echo cp_sn_rewrite($html);
		exit;
	}, 1);
}
