import { useCallback, useEffect, useState } from 'react';
import { usePortalAuth } from './auth/usePortalAuth.js';
import { getBootstrap } from './api/index.js';
import { parseHash } from './lib/router.js';
import Layout from './components/Layout.jsx';
import { ErrorBox, Loading } from './components/States.jsx';
import Panel from './pages/Panel.jsx';
import Kanban from './pages/Kanban.jsx';
import Lista from './pages/Lista.jsx';
import Gantt from './pages/Gantt.jsx';
import Fabricantes from './pages/Fabricantes.jsx';
import Config from './pages/Config.jsx';
import ProjectDetail from './pages/project/ProjectDetail.jsx';
import { useI18n } from './i18n/I18nProvider.jsx';

function currentRoute() {
  return parseHash(window.location.hash);
}

export default function App() {
  const { t, lang } = useI18n();
  const auth = usePortalAuth();
  const [route, setRoute] = useState(currentRoute);
  const [boot, setBoot] = useState(null);
  const [bootError, setBootError] = useState(null);

  // Router por hash
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#/panel`);
    }
    const onHash = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((hash) => {
    const target = hash.startsWith('#') ? hash : `#${hash.startsWith('/') ? '' : '/'}${hash}`;
    if (window.location.hash === target) {
      setRoute(currentRoute());
    } else {
      window.location.hash = target;
    }
  }, []);

  // Datos comunes (/bootstrap): familias, personas, fabricantes, plantillas y catálogo.
  const refreshBoot = useCallback(() => {
    setBootError(null);
    return getBootstrap()
      .then((data) => {
        setBoot(data);
        return data;
      })
      .catch((error) => setBootError(error));
  }, []);

  useEffect(() => {
    if (auth.user) refreshBoot();
  }, [auth.user, refreshBoot]);

  useEffect(() => {
    document.title = t('app.documentTitle');
  }, [route.name, lang, t]);

  if (auth.loading) return <Loading label={t('app.checkingSession')} />;

  const isAppAdmin = boot ? Boolean(boot.isAppAdmin) : auth.isAppAdmin;

  let content;
  if (bootError) {
    content = <ErrorBox error={bootError} title={t('app.bootError')} onRetry={refreshBoot} />;
  } else if (!boot) {
    content = <Loading />;
  } else {
    const common = { boot, navigate, refreshBoot, query: route.query };
    switch (route.name) {
      case 'kanban':
        content = <Kanban {...common} />;
        break;
      case 'gantt':
        content = <Gantt {...common} />;
        break;
      case 'lista':
        content = <Lista {...common} />;
        break;
      case 'proyecto':
        content = <ProjectDetail key={route.id} id={route.id} boot={boot} navigate={navigate} refreshBoot={refreshBoot} />;
        break;
      case 'fabricantes':
        content = <Fabricantes {...common} selectedId={route.id} />;
        break;
      case 'config':
        content = <Config {...common} />;
        break;
      default:
        content = <Panel {...common} />;
    }
  }

  return (
    <Layout user={auth.user} isAppAdmin={isAppAdmin} active={route.name}>
      {content}
    </Layout>
  );
}
