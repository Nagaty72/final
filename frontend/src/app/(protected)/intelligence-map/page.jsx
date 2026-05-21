import IntelligenceMapPage from '@/components/IntelligenceMap/IntelligenceMapPage';

export const metadata = {
  title: 'Disease Intelligence Map | Health Analytics',
  description: 'Interactive GIS map showing disease outbreak clusters across Egyptian governorates.',
};

export default function DiseasesMapPage() {
  return <IntelligenceMapPage />;
}
