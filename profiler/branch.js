/**
 * @param {import('browsertime').BrowsertimeContext} context
 * @param {import('browsertime').BrowsertimeCommands} commands
 */

export default async function (context, commands) {
  const delayTime = 500;
  await commands.measure.start("Branch - GAW - Non-cached");
  await commands.navigate(
    "https://branch-staging.climateaction.tech/"
  );
//   try {
//     await commands.click.byId("onetrust-accept-btn-handler");
//   } catch (e) {}
  await commands.scroll.byPages(1);
  await commands.wait.byTime(delayTime);
  await commands.scroll.byPages(1);
  await commands.wait.byTime(delayTime);
  await commands.scroll.toBottom(delayTime);
  await commands.measure.stop();
//   await commands.measure.start("Cached");
//   await commands.navigate(
//     "https://www.thegreenwebfoundation.org"
//   );
//   try {
//     await commands.click.byId("onetrust-accept-btn-handler");
//   } catch (e) {}
//   await commands.scroll.byPages(1);
//   await commands.wait.byTime(delayTime);
//   await commands.scroll.byPages(1);
//   await commands.wait.byTime(delayTime);
//   await commands.scroll.toBottom(delayTime);
//   return commands.measure.stop();
}
