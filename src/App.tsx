import { ChThemeProvider, PageScaffold, type ChNavbarItem } from "canopui";
import "canopui/styles.css";

const navbarItems: ChNavbarItem[] = [];

export function App() {
  return (
    <ChThemeProvider defaultMode="system">
      <PageScaffold title="PipeBoard" items={navbarItems}>
        <></>
      </PageScaffold>
    </ChThemeProvider>
  );
}
