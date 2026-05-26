Office.onReady(async (info: any) => {
  if (info.host === "Excel" || info.host === "Workbook") {
    Office.actions.associate("clearImages", clearImages);
  }
});

async function clearImages(event: any): Promise<void> {
  try {
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items");
      await context.sync();

      let count = 0;
      for (const sheet of sheets.items) {
        const shapes = sheet.shapes;
        shapes.load("items,type");
        await context.sync();
        const imageShapes = shapes.items.filter(
          (s: Excel.Shape) => s.type === Excel.ShapeType.image
        );
        for (const shape of imageShapes) {
          shape.delete();
          count++;
        }
      }
      await context.sync();
    });
  } catch (err) {
    console.error("Failed to clear images:", err);
  }

  if (event && typeof event.completed === "function") {
    event.completed();
  }
}
