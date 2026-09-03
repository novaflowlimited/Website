import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './auth/SessionProvider';
import { ToastProvider } from './components/ToastProvider';
import { RequireAuth, RequireRole } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProductsList } from './pages/products/ProductsList';
import { ProductEditor } from './pages/products/ProductEditor';
import { IndustriesList, IndustryEditor } from './pages/industries/IndustriesPage';
import { CapabilitiesList, CapabilityEditor } from './pages/capabilities/CapabilitiesPage';
import { CaseStudiesList, CaseStudyEditor } from './pages/case-studies/CaseStudiesPage';
import { ArticlesList, ArticleEditor } from './pages/insights/ArticlesPage';
import { InsightsCategoriesPage } from './pages/insights/CategoriesPage';
import { InsightsAuthorsPage } from './pages/insights/AuthorsPage';
import { MediaLibrary } from './pages/media/MediaLibrary';
import { NavigationManager } from './pages/navigation/NavigationManager';
import { SiteSettingsPage } from './pages/settings/SiteSettingsPage';
import { SeoOverview } from './pages/seo/SeoOverview';
import { ContactEnquiries } from './pages/leads/ContactEnquiries';
import { HomepageEditor } from './pages/homepage/HomepageEditor';

export default function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/products" element={<RequireAuth><ProductsList /></RequireAuth>} />
          <Route path="/products/new" element={<RequireAuth><ProductEditor /></RequireAuth>} />
          <Route path="/products/:id/edit" element={<RequireAuth><ProductEditor /></RequireAuth>} />
          <Route path="/industries" element={<RequireAuth><IndustriesList /></RequireAuth>} />
          <Route path="/industries/new" element={<RequireAuth><IndustryEditor /></RequireAuth>} />
          <Route path="/industries/:id/edit" element={<RequireAuth><IndustryEditor /></RequireAuth>} />
          <Route path="/capabilities" element={<RequireAuth><CapabilitiesList /></RequireAuth>} />
          <Route path="/capabilities/new" element={<RequireAuth><CapabilityEditor /></RequireAuth>} />
          <Route path="/capabilities/:id/edit" element={<RequireAuth><CapabilityEditor /></RequireAuth>} />
          <Route path="/case-studies" element={<RequireAuth><CaseStudiesList /></RequireAuth>} />
          <Route path="/case-studies/new" element={<RequireAuth><CaseStudyEditor /></RequireAuth>} />
          <Route path="/case-studies/:id/edit" element={<RequireAuth><CaseStudyEditor /></RequireAuth>} />
          <Route path="/insights" element={<RequireAuth><ArticlesList /></RequireAuth>} />
          <Route path="/insights/new" element={<RequireAuth><ArticleEditor /></RequireAuth>} />
          <Route path="/insights/categories" element={<RequireAuth><InsightsCategoriesPage /></RequireAuth>} />
          <Route path="/insights/authors" element={<RequireAuth><InsightsAuthorsPage /></RequireAuth>} />
          <Route path="/insights/:id/edit" element={<RequireAuth><ArticleEditor /></RequireAuth>} />
          <Route path="/media" element={<RequireAuth><MediaLibrary /></RequireAuth>} />
          <Route path="/navigation" element={<RequireRole role="admin"><NavigationManager /></RequireRole>} />
          <Route path="/site-settings" element={<RequireRole role="admin"><SiteSettingsPage /></RequireRole>} />
          <Route path="/seo" element={<RequireAuth><SeoOverview /></RequireAuth>} />
          <Route path="/homepage" element={<RequireAuth><HomepageEditor /></RequireAuth>} />
          <Route path="/contact-enquiries" element={<RequireRole role="admin"><ContactEnquiries /></RequireRole>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SessionProvider>
    </ToastProvider>
  );
}
