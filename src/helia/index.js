import { createHelia } from "helia";
import { libp2pDefaults } from "./libp2pConfig";
import { unixfs } from "@helia/unixfs";
import { peerIdFromString } from "@libp2p/peer-id";
import Denque from "denque";
import moment from "moment";

export async function bootupNode(addr) {
  const libp2p = libp2pDefaults(addr);
  return await createHelia({ libp2p });
}

export function subscribe(node, topic) {
  const fs = unixfs(node);
  // console.log("TOPIC:", topic);
  const _decoder = new TextDecoder();
  const _status = {
    currentCID: "",
    looper: { waiter: true, release: () => {}, isLoop: false },
  };
  const _buffer = new Denque();
  // const reader = new ReadableStream({
  //   async pull(controller) {
  //     if (!this._cIter) this._cIter = _buffer.shift();

  //   },
  // });
  const _responseBuffer = new Denque();
  // async function loopFunc() {
  //   const chunks = _buffer.shift();
  //   if (!!chunks) {
  //     let text = "";
  //     for await (const chunk of chunks) {
  //       text += _decoder.decode(chunk, {
  //         stream: true,
  //       });
  //     }
  //     for (let i of text.split("\n")) {
  //       _responseBuffer.push(i.split("\t"));
  //       // console.log("asdasd");
  //     }
  //   }
  //   loopFunc();
  // }
  let loopCount = 0;
  const performance_result = [];
  async function queueLooper(r) {
    await _status.looper.waiter;
    _status.looper.isLoop = true;
    const fn = _buffer.shift();
    if (fn) {
      await fn();
      ++loopCount;
      if (loopCount === 3) {
        r();
        return;
      }
    }
    if (_buffer.isEmpty()) {
      _status.looper.isLoop = false;
      _status.looper.waiter = new Promise((r) => {
        _status.looper.release = r;
      });
    }

    queueLooper(r);
  }

  async function loopFunc(content) {
    let text = "",
      item,
      res = [],
      omit,
      time1,
      time2,
      delayedTime = 0,
      idx = 0;
    for await (const chunk of fs.cat(content)) {
      text += _decoder.decode(chunk, {
        stream: true,
      });
    }
    const arr = text.split("\n");
    arr.pop();
    await new Promise((r) => {
      omit = setInterval(() => {
        item = arr[idx++].split("  ");
        time1 = moment(item[1], "x");
        time2 = moment();
        // item[1] = time1;
        // item[1] = time1.format("hh:mm:ss.sss");
        // item[2] = time2.format("hh:mm:ss.sss");
        delayedTime += item[3] = time2.diff(time1) / 1000;

        res.push(item.join("\t"));
        if (idx >= arr.length) {
          clearInterval(omit);
          r();
        }
      }, 4);
    });
    let totalTime =
      moment(arr[arr.length - 1].split("  ")[1], "x").diff(
        moment(arr[0].split("  ")[1], "x")
      ) / 1000;
    _buffer.push(() => _responseBuffer.push(res.join("\n\r")));
    performance_result.push([loopCount, idx, delayedTime, totalTime]);
  }

  // requestAnimationFrame(loopFunc);
  let evtCount = 0;
  const evt = async (message) => {
    const content = new TextDecoder().decode(message.detail.data);
    // if (_status.currentCID !== content) _buffer.push(fs.cat(content));
    // if (true) {
    // console.log(content);
    if (_status.currentCID !== content) {
      _status.currentCID = content;
      await loopFunc(content);
      if (!_status.looper.isLoop) _status.looper.release();

      ++evtCount;
      if (evtCount === 3) {
        node.libp2p.services.pubsub.unsubscribe(topic);
        node.libp2p.services.pubsub.removeEventListener("message", evt);
        return;
      }
    }
    // cb(text);
  };
  node.libp2p.services.pubsub.addEventListener("message", evt);

  node.libp2p.services.pubsub.subscribe(topic);
  const passed_result = [];
  function _queueLooper() {
    return new Promise((r) => {
      queueLooper(r);
    }).then(() => {
      let res = [0, 0, 0];
      for (let [
        loopCount,
        msgs,
        delayedTime,
        totalTime,
      ] of performance_result) {
        passed_result.push(
          `\n\rCase${loopCount + 1}:\n\r Message : ${msgs}\tDelayed Avg. : ${
            delayedTime / msgs
          }\tMPS : ${msgs / totalTime}`
        );
        res[0] += msgs;
        res[1] += delayedTime;
        res[2] += totalTime;
      }
      // console.log(res);
      passed_result.push(
        `\n\rTotal:\n\rMessage : ${res[0]}\tDelayed Avg. : ${
          res[1] / res[0]
        }\tMPS : ${res[0] / res[2]}`
      );
    });
  }
  return [_responseBuffer, _queueLooper, passed_result];
}

export async function findPeer(node, cid) {
  for await (const event of node.libp2p.services.dht.findPeer(
    peerIdFromString(cid)
  )) {
    console.log(event);
    if (event.type === 2 && event.name === "FINAL_PEER") {
      const maddr = event.peer.multiaddrs.filter((i) => i.getPeerId() !== cid);
      console.info("FIND", maddr);
      await node.libp2p.dial(maddr);
      return maddr;
    }
  }
  // node.libp2p.addEventListener("peer:discovery", (evt) => {
  //   const peerInfo = evt.detail;
  //   console.log(`Found peer ${peerInfo.id.toString()}`);

  //   // dial them when we discover them
  //   node.libp2p.dial(peerInfo.id).catch((err) => {
  //     console.log(`Could not dial ${peerInfo.id.toString()}`, err);
  //   });
  // });
}
