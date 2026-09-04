import { Venue } from "../lib/types";
import WebMapView from "./MapView.web";

interface Props {
  venues: Venue[];
}

export default function VenueMapView(props: Props) {
  return <WebMapView {...props} />;
}
