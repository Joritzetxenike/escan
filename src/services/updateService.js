import Constants from 'expo-constants';

const GITHUB_OWNER = 'Joritzetxenike';
const GITHUB_REPO = 'escan';

const GITHUB_RELEASES_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

const CURRENT_VERSION = Constants.expoConfig.version;

/**
 * Comprueba si existe una versión de Escan más nueva
 * publicada en GitHub Releases.
 */
export const comprobarActualizacion = async () => {
  try {
    const response = await fetch(GITHUB_RELEASES_URL);

    if (!response.ok) {
      throw new Error(`GitHub respondió con ${response.status}`);
    }

    const release = await response.json();

    const latestVersion = release.tag_name.replace(/^v/, '');

    return {
      hayActualizacion: compararVersiones(
        latestVersion,
        CURRENT_VERSION
      ),
      versionActual: CURRENT_VERSION,
      ultimaVersion: latestVersion,
      apkUrl:
        release.assets?.find(
          asset => asset.name.endsWith('.apk')
        )?.browser_download_url || null,
      notas: release.body || '',
    };
  } catch (error) {
    console.error('Error comprobando actualizaciones:', error);

    return {
      hayActualizacion: false,
      error: true,
    };
  }
};

const compararVersiones = (ultima, actual) => {
  const v1 = ultima.split('.').map(Number);
  const v2 = actual.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if ((v1[i] || 0) > (v2[i] || 0)) {
      return true;
    }

    if ((v1[i] || 0) < (v2[i] || 0)) {
      return false;
    }
  }

  return false;
};