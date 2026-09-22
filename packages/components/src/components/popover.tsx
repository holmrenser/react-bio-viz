// import { css } from '@emotion/react';
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";

type ReactChildren = JSX.Element[] | JSX.Element;

type PopoverTrigger = React.ReactElement & {
  onClick?: () => void;
  setReferenceElement?: () => void;
};

export function PopoverTrigger({
  children,
  togglePopover,
  setReferenceElement,
}: {
  children: React.ReactElement;
  togglePopover?: () => void;
  setReferenceElement?: () => void;
}): PopoverTrigger {
  const child = React.Children.only(children);
  return React.cloneElement(child, {
    onClick: togglePopover,
    ref: setReferenceElement,
  });
}

export function PopoverBody({
  header,
  children,
  showPopover,
  container,
  setPopperElement,
  styles,
  attributes,
  togglePopover,
  widthBody = 400,
}: {
  header: string;
  children?: ReactChildren;
  showPopover?: Boolean;
  container?: Element;
  setPopperElement?: () => void;
  styles?: Record<"popper" & string, any>;
  attributes?: Record<"popper" & string, any>;
  togglePopover?: () => void;
  widthBody?: Number;
}): JSX.Element {
  if (!showPopover || container === undefined) {
    return <></>;
  }
  const _styles = styles === undefined ? { popper: {} } : styles;
  const _attributes = attributes === undefined ? { popper: {} } : attributes;
  const popoverBody = (
    <div
      id="popover"
      ref={setPopperElement}
      style={{
        backgroundColor: "white",
        maxWidth: `${widthBody}px`,
        ..._styles.popper,
      }}
      {..._attributes.popper}
    >
      <nav className="panel">
        <p className="panel-heading">
          <button
            type="button"
            className="delete"
            onClick={togglePopover}
            aria-label="delete"
            style={{ marginRight: "16px" }}
          >
            &times;
          </button>
          {header}
        </p>
        <div className="panel-block">
          <div className="content is-small">{children}</div>
        </div>
      </nav>
    </div>
  );
  return createPortal(popoverBody, container);
}

export function Popover({
  children,
}: {
  children: ReactChildren;
}): JSX.Element {
  const [showPopover, setShowPopover] = useState(false);
  function togglePopover() {
    setShowPopover(!showPopover);
  }

  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement);

  const container = document.querySelector("body");

  const childProps = {
    togglePopover,
    showPopover,
    container,
    setReferenceElement,
    setPopperElement,
    styles,
    attributes,
  };

  return (
    <>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, childProps)
      )}
    </>
  );
}
