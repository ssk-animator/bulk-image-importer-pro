export function parseCellReference(ref: string): { row: number; column: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;

  const colStr = match[1].toUpperCase();
  let column = 0;
  for (let i = 0; i < colStr.length; i++) {
    column = column * 26 + (colStr.charCodeAt(i) - 64);
  }
  const row = parseInt(match[2], 10);
  return { row: row - 1, column: column - 1 };
}

export function formatCellReference(row: number, column: number): string {
  let colStr = "";
  let c = column + 1;
  while (c > 0) {
    c--;
    colStr = String.fromCharCode(65 + (c % 26)) + colStr;
    c = Math.floor(c / 26);
  }
  return `${colStr}${row + 1}`;
}

export function columnWidthToPoints(width: number): number {
  return width * 7.5;
}

export function pointsToColumnWidth(points: number): number {
  return points / 7.5;
}

export async function ensureWorksheet(
  worksheetName: string = "Images"
): Promise<Excel.Worksheet> {
  return Excel.run(async (context) => {
    const worksheets = context.workbook.worksheets;
    let sheet: Excel.Worksheet | null = null;

    worksheets.load("items,name");
    await context.sync();

    const existing = worksheets.items.find((ws) => ws.name === worksheetName);
    if (existing) {
      sheet = existing;
      sheet.activate();
    } else {
      sheet = worksheets.add(worksheetName);
      sheet.activate();
    }

    return sheet;
  });
}

export async function insertImageToWorksheet(
  worksheet: Excel.Worksheet,
  dataUrl: string,
  left: number,
  top: number,
  width: number,
  height: number
): Promise<Excel.Shape | null> {
  try {
    const context = worksheet.context;
    const shapes = worksheet.shapes;

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");

    const shape = shapes.addImage(base64Data);

    shape.left = left;
    shape.top = top;
    shape.width = width;
    shape.height = height;

    shape.placement = Excel.Placement.twoCell;

    await context.sync();
    return shape;
  } catch (err) {
    console.error("Failed to insert image:", err);
    return null;
  }
}

export async function clearAllImagesOnSheet(
  worksheet: Excel.Worksheet
): Promise<void> {
  return Excel.run(async (context) => {
    const shapes = worksheet.shapes;
    shapes.load("items,type");
    await context.sync();

    const imageShapes = shapes.items.filter((s) => s.type === Excel.ShapeType.image);
    for (const shape of imageShapes) {
      shape.delete();
    }

    await context.sync();
  });
}
