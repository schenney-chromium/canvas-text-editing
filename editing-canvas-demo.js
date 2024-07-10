class AppState {
  canvas_elmt;
  context;
  text_metrics;
  string = "This is a demonstration of the new Canvas Text Metrics APIs for editing";
  string_x = 10;
  string_y;
  selection_start_position = 0;
  caret_position;
  selection_rect = new DOMRect();;
  text_buffer = "";
  in_drag_state = false;
  have_caret = false;
  have_selection = false;

  constructor(canvas) {
    this.canvas_elmt = canvas;
    this.context = this.canvas_elmt.getContext("2d");
    this.context.font = "15px sans-serif";
    this.text_metrics = this.context.measureText(this.string);

    this.string_y = this.canvas_elmt.height / 2;

    this.canvas_elmt.addEventListener('mousedown', handleMouseDown);
    this.canvas_elmt.addEventListener('mousemove', handleMouseMove);
    this.canvas_elmt.addEventListener('mouseup', handleMouseUp);
    this.canvas_elmt.addEventListener('mouseleave', handleMouseUp);
    this.canvas_elmt.addEventListener("keyup", handleKeyUp);

    this.canvas_elmt.focus();

    this.redraw();
  }

  redraw() {
    this.context.clearRect(0, 0, this.canvas_elmt.width, this.canvas_elmt.height);
    if (this.have_selection) {
      this.context.fillStyle = 'yellow';
      this.context.fillRect(this.selection_rect.x + this.string_x,
                            this.selection_rect.y + this.string_y,
                            this.selection_rect.width,
                            this.selection_rect.height)
    }

    this.context.font = "15px sans-serif";
    this.context.fillStyle = 'black';
    this.context.fillText(this.string, this.string_x, this.string_y);

    if (this.have_caret) {
      let caret_x = this.caretLocationFromPosition();
      this.context.fillStyle = 'red';
      this.context.beginPath();
      this.context.moveTo(caret_x + this.string_x,
                          this.string_y - this.text_metrics.actualBoundingBoxAscent);
      this.context.lineTo(caret_x + this.string_x,
                          this.string_y + this.text_metrics.actualBoundingBoxDescent);
      this.context.stroke();
    }
  }

  onStringChanged() {
    this.text_metrics = this.context.measureText(this.string);
  }

  caretLocationFromPosition() {
    if (this.caret_position == 0) {
      return 0;
    }
    let sub_string = this.string.substring(0, this.caret_position);
    let sub_metrics = this.context.measureText(sub_string);
    return sub_metrics.width;
  }

  copySelected() {
    if (!this.have_selection) {
      // There is no selected text to copy
      return;
    }
    let selection_range = this.selectionRange();
    this.text_buffer = this.string.substring(selection_range[0], selection_range[1]);
  }

  deleteSelected() {
    if (!this.have_selection) {
      // There is no selected text to copy
      return;
    }
    let selection_range = this.selectionRange();
    this.text_buffer = this.string.substring(selection_range[0], selection_range[1]);
    this.clearSelection();
    this.deleteRange(selection_range[0], selection_range[1]);
  }

  deleteRange(start, end) {
    let new_string = this.string.substring(0, start) +
                     this.string.substring(end, this.string.length);
    this.caret_position = start;
    this.string = new_string;
    this.onStringChnaged();
    this.have_caret = true;
    this.redraw();
  }

  insertTextBuffer() {
    if (this.text_buffer.length == 0) {
      // Nothing to insert.
      return;
    }
    this.insertCharacters(this.text_buffer)
  }

  insertCharacters(character_string) {
    if (!this.have_caret && !this.have_selection) {
      // No place to insert the text.
      return;
    }
    if (this.have_selection) {
      // Remove the selection, making it the buffer.
      this.deleteSelected();
    }
    let new_string = this.string.substring(0, this.caret_position)
                   + character_string
                   + this.string.substring(this.caret_position, this.string.length);
    this.string = new_string;
    this.onStringChnaged();
    this.caret_position += character_string.length;
    this.redraw();    
  }

  selectionRange() {
    if (!this.have_selection) {
      return null;
    }
    let left_posn = g_app_state.selection_start_position;
    let right_posn = g_app_state.caret_position;
    if (left_posn == right_posn) {
      return null;
    }
    if (left_posn > right_posn) {
      let tmp_posn = left_posn;
      left_posn = right_posn;
      right_posn = tmp_posn;
    }
    return [left_posn, right_posn];    
  }

  clearSelection() {
    this.have_selection = false;
  }
}

g_app_state = undefined;

function handleMouseDown(event) {
  if (event.buttons != 1)
    return;
  text_left = g_app_state.string_x - g_app_state.text_metrics.actualBoundingBoxLeft;
  text_top = g_app_state.string_y - g_app_state.text_metrics.actualBoundingBoxAscent;
  text_right = g_app_state.string_x + g_app_state.text_metrics.actualBoundingBoxRight;
  text_bottom = g_app_state.string_y + g_app_state.text_metrics.actualBoundingBoxDescent;
  if (event.offsetX >= text_left &&
      event.offsetX <= text_right &&
      event.offsetY >= text_top &&
      event.offsetY <= text_bottom) {
    text_offset = event.offsetX - g_app_state.string_x;
    g_app_state.in_drag_state = true;
    g_app_state.clearSelection();
    g_app_state.selection_start_position = g_app_state.text_metrics.caretPositionFromPoint(text_offset);
    g_app_state.caret_position = g_app_state.selection_start_position;
    g_app_state.have_caret = true;
    g_app_state.selection_rect = new DOMRect();
  } else {
    g_app_state.clearSelection();
    g_app_state.have_caret = false;
  }
  g_app_state.redraw();
}

function handleMouseMove(event) {
  if (!g_app_state.in_drag_state) {
    return;
  }

  text_offset = event.offsetX - g_app_state.string_x;
  g_app_state.caret_position = g_app_state.text_metrics.caretPositionFromPoint(text_offset);
  g_app_state.have_selection = true;

  let selection_range = g_app_state.selectionRange();
  if (!selection_range) {
    return;
  }
  g_app_state.selection_rect = g_app_state.text_metrics.getSelectionRects(selection_range[0], selection_range[1])[0];
  g_app_state.have_caret = false;
  g_app_state.redraw();
}

function handleMouseUp(event) {
  g_app_state.in_drag_state = false;
}

function handleKeyUp(event) {
  if (g_app_state.in_drag_state) {
    // Ignore key input while dragging
    return;
  }
  if (event.ctrlKey) {
    if (event.key == 'c') {
      g_app_state.copySelected();
    }
    if (event.ctrlKey && event.key == 'v') {
      g_app_state.insertTextBuffer();
    }
    if (event.ctrlKey && event.key == 'x') {
      g_app_state.deleteSelected();
    }
  } else if (!event.metaKey && !event.altkey) {
    if (event.key.length == 1) {
      // Process a text insert. The length == 1 check is a hack to get
      // the set of letters, numbers and punctuation, but not emoji nor
      // any glyph with multiple characters.
      g_app_state.insertCharacters(event.key);
    } else if (event.key == "Backspace" && g_app_state.caret_position > 0) {
      if (g_app_state.have_selection) {
        g_app_state.deleteSelected();
      } else if (g_app_state.have_caret) {
        g_app_state.deleteRange(g_app_state.caret_position - 1,
                                g_app_state.caret_position);
      }
    }
  }
  event.preventDefault();
}

function setupApp() {
  g_app_state = new AppState(document.getElementById("canvas"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupApp);
} else {
  // `DOMContentLoaded` has already fired
  setupApp();
}
