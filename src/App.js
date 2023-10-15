import { styled } from "@mui/material";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebglAddon } from "xterm-addon-webgl";
import commandsSetup from "./commands";
import "xterm/css/xterm.css";

const StyledDiv = styled("div")({
  [`& > .terminal`]: { height: "100%" },
});

function App() {
  const ref = useRef();
  
  const term = useMemo(() => {
    const term = new Terminal();
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    const webgl = new WebglAddon();
    term.loadAddon(webgl);
    term.init = (el) => {
      term.open(el);
      fitAddon.fit();
    };
    let command = "";
    term.prompt = () => {
      command = "";
      term.write("\r\n$ ");
    };
    term.onData((e) => {
      switch (e) {
        case "\u0003": // Ctrl+C
          term.write("^C");
          term.prompt(term);
          break;
        case "\r": // Enter
          runCommand(command);
          command = "";
          break;
        case "\u007F": // Backspace (DEL)
          // Do not delete the prompt
          if (term._core.buffer.x > 2) {
            term.write("\b \b");
            if (command.length > 0) {
              command = command.substr(0, command.length - 1);
            }
          }
          break;
        default: // Print all other characters for demo
          if (
            (e >= String.fromCharCode(0x20) &&
              e <= String.fromCharCode(0x7e)) ||
            e >= "\u00a0"
          ) {
            command += e;
            term.write(e);
          }
      }
    });
    function onResize() {
      fitAddon.fit();
    }
    window.addEventListener("resize", onResize);
    term.disposeAll = () => {
      window.removeEventListener("resize", onResize);
      fitAddon.dispose();
      webgl.dispose();
      term.dispose();
    };
    return term;
  }, []);
  const commands = useMemo(() => {
    return {
      help: {
        f: (opt) => {
          console.log(opt);
          const padding = 10;
          function formatMessage(name, description) {
            const maxLength = term.cols - padding - 3;
            let remaining = description;
            const d = [];
            while (remaining.length > 0) {
              // Trim any spaces left over from the previous line
              remaining = remaining.trimStart();
              // Check if the remaining text fits
              if (remaining.length < maxLength) {
                d.push(remaining);
                remaining = "";
              } else {
                let splitIndex = -1;
                // Check if the remaining line wraps already
                if (remaining[maxLength] === " ") {
                  splitIndex = maxLength;
                } else {
                  // Find the last space to use as the split index
                  for (let i = maxLength - 1; i >= 0; i--) {
                    if (remaining[i] === " ") {
                      splitIndex = i;
                      break;
                    }
                  }
                }
                d.push(remaining.substring(0, splitIndex));
                remaining = remaining.substring(splitIndex);
              }
            }
            const message =
              `  \x1b[36;1m${name.padEnd(padding)}\x1b[0m ${d[0]}` +
              d.slice(1).map((e) => `\r\n  ${" ".repeat(padding)} ${e}`);
            return message;
          }
          term.writeln(
            [
              "Welcome to xterm.js! Try some of the commands below.",
              "",
              ...Object.keys(commands).map((e) =>
                formatMessage(e, commands[e].description)
              ),
            ].join("\n\r")
          );
          term.prompt();
        },
        description: "Prints this help message",
      },
      loadtest: {
        f: () => {
          let testData = [];
          let byteCount = 0;
          for (let i = 0; i < 50; i++) {
            let count = 1 + Math.floor(Math.random() * 79);
            byteCount += count + 2;
            let data = new Uint8Array(count + 2);
            data[0] = 0x0a; // \n
            for (let i = 1; i < count + 1; i++) {
              data[i] = 0x61 + Math.floor(Math.random() * (0x7a - 0x61));
            }
            // End each line with \r so the cursor remains constant, this is what ls/tree do and improves
            // performance significantly due to the cursor DOM element not needing to change
            data[data.length - 1] = 0x0d; // \r
            testData.push(data);
          }
          let start = performance.now();
          for (let i = 0; i < 1024; i++) {
            for (const d of testData) {
              term.write(d);
            }
          }
          // Wait for all data to be parsed before evaluating time
          term.write("", () => {
            let time = Math.round(performance.now() - start);
            let mbs = ((byteCount / 1024) * (1 / (time / 1000))).toFixed(2);
            term.write(
              `\n\r\nWrote ${byteCount}kB in ${time}ms (${mbs}MB/s) using the renderer`
            );
            term.prompt();
          });
        },
        description: "Simulate a lot of data coming from a process",
      },
      ...commandsSetup(term),
    };
  }, []);
  const runCommand = useCallback((text) => {
    const inputText = text
      .trim()
      .split(" ")
      .map((i) => {
        const res = i.trim();
        if (res === "") return undefined;
        return res;
      })
      .filter((i) => i !== undefined);
    const command = inputText[0];
    const opt = inputText
      .map((i, idx) => {
        if (i.startsWith("--")) {
          return [
            i.replace("--", ""),
            inputText.length <= idx + 1 ||
            (inputText[idx + 1] ?? "").startsWith("-")
              ? true
              : inputText[idx + 1],
          ];
        }
        return undefined;
      })
      .filter((i) => i !== undefined);

    if (command.length > 0) {
      term.writeln("");
      if (command in commands) {
        commands[command].f(Object.fromEntries(opt));
        return;
      }
      term.writeln(`${command}: command not found`);
    }
    term.prompt();
  }, []);

  useLayoutEffect(() => {
    term.init(ref.current);
    term.prompt();
    return () => {
      term.disposeAll();
    };
  }, []);

  return (
    <StyledDiv
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
      ref={ref}
    ></StyledDiv>
  );
}

export default App;
