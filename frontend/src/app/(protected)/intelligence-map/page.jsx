import IntelligenceMapPage from '@/components/IntelligenceMap/IntelligenceMapPage';

export const metadata = {
  title: 'Disease Intelligence Map | Epicare',
  description: 'Interactive GIS map showing disease outbreak clusters across Egyptian governorates.',
};

export default function DiseasesMapPage() {
  return <IntelligenceMapPage />;
}
