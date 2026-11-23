// Sprites: turns pixel-art rows (from SpriteData) into a crisp inline <svg>.
// Each run of same-coloured pixels in a row becomes one <rect>, so the SVG stays small.
package web;

import java.util.Map;

final class Sprites {

    private Sprites() {}

    /** title = accessible name (null = decorative); cls and style may be empty. Only fixed text, never user input. */
    static String svg(String[] rows, Map<Character, String> palette, int scale, String cls, String title, String style) {
        int w = rows[0].length();
        int h = rows.length;
        StringBuilder sb = new StringBuilder(256);
        sb.append("<svg class=\"sprite").append(cls.isEmpty() ? "" : " " + cls).append('"')
          .append(" width=\"").append(w * scale).append("\" height=\"").append(h * scale).append('"')
          .append(" viewBox=\"0 0 ").append(w).append(' ').append(h).append("\" shape-rendering=\"crispEdges\"");
        if (!style.isEmpty()) sb.append(" style=\"").append(style).append('"');
        sb.append(title == null ? " aria-hidden=\"true\">" : " role=\"img\" aria-label=\"" + title + "\">");
        for (int y = 0; y < h; y++) {
            String row = rows[y];
            int x = 0;
            while (x < row.length()) {
                String fill = palette.get(row.charAt(x));
                if (fill == null) {
                    x++;
                    continue;
                }
                int n = 1;
                while (x + n < row.length() && row.charAt(x + n) == row.charAt(x)) n++;
                sb.append("<rect x=\"").append(x).append("\" y=\"").append(y).append("\" width=\"").append(n)
                  .append("\" height=\"1\" fill=\"").append(fill).append("\"/>");
                x += n;
            }
        }
        return sb.append("</svg>").toString();
    }
}
