import React, { useRef, useState } from "react";
import { unixfs } from "@helia/unixfs";
import { createHelia } from "helia";
import { styled } from "@mui/material";
import ChevronRight from "./chevron_right.svg";

const RootDiv = styled("div")(({ theme }) => ({
  width: "100%",
  height: "100%",
  [`& > .console-container`]: {
    [`& > .line`]: {
      position: "relative",
      borderBottom: "1px solid #eee",
      lineHeight: "1.4rem",
      [`& > .output`]: {
        position: "relative",
        display: "flex",
        maxWidth: "100%",
        padding: "8px",
        paddingLeft: "28px",
        fontSize: "16px",
        lineHeight: "20px",
      },
      [`& > .input`]: {
        position: "relative",
        display: "flex",
        maxWidth: "100%",
        padding: "12px",
        paddingLeft: "28px",
        fontSize: "16px",
        lineHeight: "18px",
        [`&::before`]: {
          top: 0,
          backgroundImage: `url(${ChevronRight})`,
        },
      },
      [`& > .prompt`]: {
        whiteSpace: "pre-wrap",
        overflowX: "auto",
        [`&::before`]: {
          position: "absolute",
          content: '""',
          top: "12px",
          left: 0,
          width: "20px",
          height: "20px",
          backgroundPosition: "50% 50%",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        },
      },
      [`& > .log`]: {
        [`&:before`]: {
          backgroundImage: "none",
        },
      },
    },
    [`& > .container`]: {
      position: "relative",
      padding: "0 24px",
      [`& > .line`]: {
        [`& > .output`]: {
          lineHeight: "30px",
          [`& > #terminal`]: {
            [`& > #output`]: {
              [`& > p`]: { margin: 0 },
            },
          },
        },
        [`& > .input`]: {
          backgroundColor: "#eee",
        },
      },
    },
  },
  [`& > .input-container`]: {
    position: "relative",
    width: "100%",
    display: "block",
    zIndex: 10,
    [`&::before`]: {
      position: "absolute",
      content: '""',
      top: "12px",
      left: 0,
      width: "20px",
      height: "20px",
      backgroundPosition: "50% 50%",
      backgroundImage: `url(${ChevronRight})`,
      backgroundRepeat: "no-repeat",
    },
    [`& > input`]: {
      width: "100%",
      padding: "12px",
      paddingLeft: "28px",
      border: 0,
      outline: "none",
      resize: "none",
      fontSize: "16px",
      lineHeight: "18px",
    },
  },
}));

function App() {
  const [output, setOutput] = useState([]);
  const [helia, setHelia] = useState(null);
  const [title, setTitle] = useState("");
  // const [inputText, setInputText] = useState([]);

  const terminalEl = useRef(null);

  const COLORS = {
    active: "#357edd",
    success: "#0cb892",
    error: "#ea5037",
  };

  const showStatus = (text, color, id) => {
    setOutput((prev) => {
      return [
        ...prev,
        {
          content: text,
          color,
          id,
        },
      ];
    });

    // terminalEl.current.scroll({
    //   top: window.terminal.scrollHeight,
    //   behavior: "smooth",
    // });
  };

  const store = async (name, content) => {
    let node = helia;

    if (!helia) {
      showStatus("Creating Helia node...", COLORS.active);

      node = await createHelia();

      setHelia(node);
    }

    showStatus(
      `Connecting to ${node.libp2p.peerId}...`,
      COLORS.active,
      node.libp2p.peerId
    );

    const encoder = new TextEncoder();

    const fileToAdd = {
      path: `${name}`,
      content: encoder.encode(content),
    };

    const fs = unixfs(node);

    showStatus(`Adding file ${fileToAdd.path}...`, COLORS.active);
    const cid = await fs.addFile(fileToAdd, node.blockstore);

    showStatus(`Added to ${cid}`, COLORS.success, cid);
    showStatus("Reading file...", COLORS.active);
    const decoder = new TextDecoder();
    let text = "";

    for await (const chunk of fs.cat(cid)) {
      text += decoder.decode(chunk, {
        stream: true,
      });
    }

    showStatus(`\u2514\u2500 ${name} ${text}`);
    showStatus(`Preview: https://ipfs.io/ipfs/${cid}`, COLORS.success);
  };

  const handleSubmit = async (e) => {
    // e.preventDefault();
    try {
      if (title == null || title.trim() === "") {
        throw new Error("File content is missing...");
      }
      await store(title);
    } catch (err) {
      showStatus(err.message, COLORS.error);
    }
    // setInputText((prev) => [...prev, { inputTitle: title }]);
    setOutput((prev) => [...prev, { input: title }]);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
      setTitle("");
    }
  };

  console.log(output);

  return (
    <RootDiv>
      <div className="console-container">
        <div className="line">
          <div className="prompt output log">
            <div className="string">
              <span>
                Add data to IPFS from the browser
                <br />
                Version : 1.0.0
              </span>
            </div>
          </div>
        </div>
        {output && output.length > 0 && (
          <div className="container">
            {output.map((log, index) => (
              <React.Fragment>
                <div className="line">
                  <div
                    className="prompt input"
                    key={index}
                    style={{ color: "#7d7d7d" }}
                  >
                    {log.input}
                  </div>
                </div>
                <div className="line">
                  <div className="prompt output log response error">
                    <div id="terminal" className="terminal" ref={terminalEl}>
                      <div id="output">
                        <p key={index} style={{ color: log.color }} id={log.id}>
                          {log.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <div className="input-container">
        <input
          autoFocus="true"
          rows="1"
          type="text"
          required
          value={title}
          onKeyDown={handleEnter}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
    </RootDiv>
  );
}

export default App;
